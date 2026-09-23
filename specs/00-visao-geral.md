# ReloadCars — Visão geral

Origem: TCC *"Mobilidade urbana sustentável com veículos elétricos"* (PUC Minas Betim,
Sistemas de Informação, nov/2024 — Symon Breno Brandão Silva e Victor Rafael da Silva
Santos; orientador Júlio Conway) e o vídeo do MVP rodando no Expo Go.

## Problema

A falta de informação sobre pontos de recarga é uma barreira para quem tem ou quer ter um
veículo elétrico (VE). Na pesquisa do TCC, 81% dos 21 participantes disseram que a
insegurança para encontrar pontos de recarga pesa na decisão de compra de um VE.

## Proposta

Aplicativo móvel que mostra os pontos de recarga próximos e ao longo de um trajeto, traça a
rota até o ponto escolhido, envia a navegação para o GPS nativo do celular e guarda o
histórico de recargas do motorista (local, tempo, energia e custo).

## Modelo de negócio

Parcerias com estabelecimentos que têm pontos de recarga: o ReloadCars divulga esses pontos
para os motoristas e essa divulgação é a fonte de renda.

## Perfis

| Perfil | Onde usa | O que faz |
|---|---|---|
| **Motorista** | App mobile | Cria conta, busca pontos, vê rota, abre o GPS nativo, registra recargas e consulta o histórico |
| **Admin** | Painel web | Cadastra, altera e remove parceiros e pontos de recarga |

## Requisitos funcionais

Numeração do TCC mantida; os novos começam em RF08.

| Id | Requisito | Perfil |
|---|---|---|
| RF01 | Login com e-mail e senha | Ambos |
| RF02 | Cadastro com nome, e-mail, senha e confirmação de senha | Motorista |
| RF03 | Consultar o próprio perfil (nome, e-mail) | Ambos |
| RF04 | Alterar dados cadastrais | Ambos |
| RF05 | Buscar trajeto a partir da localização atual até um destino | Motorista |
| RF06 | Relatório da recarga: tempo de uso, energia e valor total esperado | Motorista |
| RF07 | Mostrar os pontos disponíveis ao longo do trajeto | Motorista |
| RF08 | Mostrar no mapa os pontos próximos da localização atual | Motorista |
| RF09 | Selecionar um ponto e ver a rota até ele desenhada no mapa | Motorista |
| RF10 | Abrir a navegação no app de GPS nativo ("Como chegar") | Motorista |
| RF11 | Registrar uma recarga realizada, com valor calculado automaticamente | Motorista |
| RF12 | Consultar o histórico de recargas | Motorista |
| RF13 | CRUD de parceiros (estabelecimentos) | Admin |
| RF14 | CRUD de pontos de recarga (localização, potência, preço, conectores) | Admin |

## Requisitos não funcionais

| Id | Requisito |
|---|---|
| RNF01 | A busca de trajeto responde em até 10 segundos |
| RNF02 | Cadastro de pontos disponível pelo menos 20 h por dia |
| RNF03 | Seleção de ponto e rota disponíveis pelo menos 20 h por dia |
| RNF04 | Interface intuitiva e de fácil uso |
| RNF05 | Dados armazenados de forma íntegra (validação na API, constraints no banco) |
| RNF06 | Dados persistentes |
| RNF07 | Senhas nunca armazenadas em texto; sessões seguras (Better Auth) |

## Fluxo principal (motorista)

1. Abre o app → tem conta? Se não, cria conta (RF02).
2. Login (RF01) → mapa com a posição atual e os pontos próximos (RF08).
3. Seleciona um ponto → rota desenhada no mapa (RF09).
4. "Como chegar" → abre o GPS nativo (RF10).
5. Após recarregar → registra a recarga (RF11) → aparece no histórico (RF12).

## Modelo de dados (proposta)

Evolução do diagrama do TCC (User, Reload, ChargePoint), agora em PostgreSQL + PostGIS com
Drizzle. As tabelas de autenticação (`user`, `session`, `account`, `verification`) são
geradas pela Better Auth.

- **user**: dados da Better Auth + `role` (`driver` | `admin`)
- **partner**: `id`, `name`, `document` (CNPJ), `email`, `phone`, `active`, `createdAt`
- **charge_point**: `id`, `partnerId`, `name`, `description`, `address`,
  `location` (geometry Point, SRID 4326, com índice GiST), `powerKw`,
  `pricePerKwhCents`, `connectors` (Tipo 2, CCS2, CHAdeMO, GB/T), `openingHours`,
  `active`, `createdAt`, `updatedAt`
- **reload**: `id`, `userId`, `chargePointId`, `durationMinutes`, `energyKwh`,
  `pricePerKwhCents` (cópia do preço no momento da recarga), `totalCents`, `createdAt`

Mudanças em relação ao TCC:
- Valores deixam de ser `String`. Dinheiro é guardado em centavos (inteiro) e energia em
  `numeric`.
- O cálculo passa a ser automático: `energia = potência (kW) × horas` e
  `total = energia × preço por kWh`. No MVP, 3 h resultavam em 30 kWh e R$ 30,00, o que
  equivale a 10 kW a R$ 1,00/kWh.
- Os pontos pertencem a um parceiro, o que sustenta o modelo de negócio.

## Evoluções futuras (do TCC)

Pagamento integrado no app, sistema de recompensas/fidelidade, destaque pago para
parceiros, importação de pontos públicos (Open Charge Map), uso embarcado no veículo.
