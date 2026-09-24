# Etapa 4 — Registro e histórico de recargas

Atende RF06 (relatório: tempo de uso e valor total esperado), RF11 (registrar recarga com
valor calculado automaticamente) e RF12 (histórico). No TCC, o cálculo automático era um
"trabalho futuro"; no MVP o valor era fixo (3 h → 30 kWh → R$ 30,00).

## Regras de cálculo

1. **Energia (kWh)**
   - Se o motorista informar a energia (o carregador costuma mostrar os kWh entregues),
     vale o valor informado.
   - Senão, é **estimada**: `potência do ponto (kW) × tempo (h)`. A recarga fica marcada
     como estimada, porque o carro pode aceitar menos potência que o carregador.
   - Sem potência cadastrada e sem energia informada, o registro é recusado com uma
     mensagem pedindo a energia.
   - A estimativa **superestima** a energia real: em AC o carro costuma aceitar menos que
     o carregador (muitos elétricos aceitam 7 a 11 kW), e em DC a potência cai perto de 80%
     de bateria, além das perdas. Decisão (24/09/2026): manter a fórmula simples do MVP,
     marcada como "estimada", e evoluir com o cadastro do veículo (ver roadmap).
2. **Preço por kWh**
   - Ponto de parceiro com preço cadastrado: vale o preço do parceiro (o app mostra, não
     deixa editar).
   - Ponto sem preço (a maioria dos públicos): o motorista pode informar; se não
     informar, a recarga fica sem valor.
   - O preço usado é **copiado** para a recarga, então mudanças futuras de preço não
     alteram o histórico.
3. **Total** = energia × preço por kWh, arredondado para centavos. Sem preço, sem total.
4. O servidor refaz todas as contas; o app só mostra uma prévia.

## Dados

**reload**: `id`, `userId`, `chargePointId` (fica nulo se o ponto for excluído),
`chargePointName` e `chargePointAddress` (cópias, para o histórico sobreviver à exclusão
do ponto), `chargedAt`, `durationMinutes` (1 a 1440), `energyKwh` (`numeric(8,2)`),
`energyEstimated`, `pricePerKwhCents`, `totalCents`, `createdAt`. Índice por
`(userId, chargedAt)`.

## API (todas exigem sessão; cada motorista só vê as próprias recargas)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/reloads` | `{ chargePointId, durationMinutes, energyKwh?, pricePerKwhCents? }` → 201 com a recarga calculada; 404 se o ponto não existe/está inativo; 400 se não dá para calcular a energia |
| GET | `/reloads` | As 100 recargas mais recentes + resumo do mês atual (horário de Brasília): quantidade, kWh e total gasto |
| DELETE | `/reloads/:id` | Exclui uma recarga própria (204); 404 se não existe ou é de outro motorista |

## App

- **Aba Recargas** (como no vídeo: logo e botão "+" verde no topo):
  - cartão "Este mês": recargas, energia e total gasto;
  - lista: data por extenso em português, local, tempo de uso, energia (com "estimada"
    quando for o caso) e valor ("Valor não informado" quando não houver preço);
  - segurar uma recarga oferece excluir, com confirmação;
  - sem recargas: o estado vazio atual, com um botão para registrar.
- **Nova recarga** (botão "+" ou "Registrar recarga aqui" no painel de um ponto):
  - local: o ponto escolhido, ou "Selecionar local" → lista dos pontos mais próximos;
  - tempo de uso: horas e minutos;
  - energia: preenchida com a estimativa, editável ("confira no carregador");
  - preço por kWh: fixo para parceiros com preço; campo livre para os demais;
  - prévia do total atualizada enquanto digita;
  - "Salvar" → **relatório da recarga** (RF06), no visual do MVP: energia, tempo e valor
    em círculos, e botão "Concluído".

## Critérios de aceite

- Testes da API para: energia informada × estimada, preço do parceiro × informado × sem
  preço, recusa sem potência nem energia, ponto inativo, resumo do mês, isolamento entre
  motoristas, exclusão e 401.
- No iPhone: registrar uma recarga num parceiro e num ponto público, ver o relatório,
  ver no histórico e no resumo do mês, e excluir uma.
- Lint e typecheck sem erros nos dois projetos.

## Fora do escopo (futuro)

Cadastro do veículo para estimar melhor a energia; escolher data e hora de uma recarga passada, editar uma recarga, paginação do histórico
(além de 100), pagamento pelo app.
