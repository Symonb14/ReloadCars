# Etapa 5 — Painel web do admin

Atende RF13 (CRUD de parceiros), RF14 (CRUD de pontos de recarga) e RNF02 (cadastro de
pontos disponível). No TCC, o administrador é "responsável exclusivamente pelo
gerenciamento dos pontos de recarga"; aqui ele também gerencia os parceiros, que
sustentam o modelo de negócio.

## Tecnologias

| Necessidade | Escolha | Por quê |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack, React 19) | Previsto no roadmap; padrão atual (NLW mais recente da Rocketseat) |
| Estilo e componentes | **Tailwind v4** + **shadcn/ui** (Base UI): sidebar, tabela, formulário, diálogo, menu, toast | Componentes acessíveis copiados para o projeto, sem dependência de biblioteca fechada |
| Identidade visual | Fonte **Inter**; menu lateral **grafite** (#111827) com item ativo em **verde** (#22c55e), conteúdo claro | Mesmas cores do app (botão "Criar conta", cartão "Este mês"); decidido em 24/09/2026 após a primeira versão parecer genérica |
| Dados | **TanStack Query** + hooks gerados pelo **Orval** do mesmo `openapi.json` | Mesmo padrão do mobile; o painel quebra na compilação se a API mudar |
| Formulários | react-hook-form + Zod | Mesmo padrão do mobile |
| Login | Better Auth (`better-auth/react`) | Mesma autenticação da API |
| Mapa (posição do ponto) | **MapLibre** via `react-map-gl` + estilo **OpenFreeMap** | Grátis, sem chave e sem limite de uso; uso comercial permitido; crédito automático |
| Busca de endereço | Rotas `/places/*` que a API já tem (Mapbox Search Box) | Nada novo |
| Lint | Biome | Igual aos outros projetos |

### Conexão com a API: proxy do Next.js

O painel (`localhost:3000`) encaminha `/backend/*` para a API (`localhost:3333`) via
`rewrites`. Para o navegador, painel e API ficam no mesmo endereço: o cookie de sessão é
de primeira parte, sem CORS nem cookies entre domínios, e funciona igual em produção
(basta apontar o destino do proxy para a URL da API).

## Acesso

- Só contas `admin` usam o painel. O admin é criado com `npm run create-admin` no
  `server/` (o cadastro público sempre cria motoristas).
- `proxy.ts` do Next redireciona para `/login` quem não tem cookie de sessão (checagem
  rápida). A API é quem garante a segurança: toda rota `/admin/*` exige perfil `admin`
  (403 para motoristas).
- Motorista que fizer login no painel vê "Acesso restrito a administradores" e o botão
  sair.
- O contrário é permitido de propósito: a conta admin pode entrar no app do motorista
  (ver spec 03).

## API — rotas novas (todas exigem perfil `admin`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/admin/overview` | Indicadores da Visão geral |
| GET | `/admin/partners` | Parceiros com a quantidade de pontos |
| POST | `/admin/partners` | Cria parceiro: nome (obrigatório), CNPJ (validado), e-mail, telefone |
| GET / PATCH / DELETE | `/admin/partners/:id` | Detalhe, edição (inclui ativar/desativar) e exclusão (exclui os pontos do parceiro; o histórico de recargas fica, pois guarda cópias) |
| GET | `/admin/charge-points?source&partnerId&q` | Todos os pontos (parceiros e públicos), com filtros |
| POST | `/admin/charge-points` | Cria ponto de parceiro |
| GET / PATCH / DELETE | `/admin/charge-points/:id` | Detalhe, edição e exclusão de ponto de parceiro |

Pontos públicos (Open Charge Map) aparecem na listagem, mas **não são editáveis nem
excluíveis** pelo painel (409): são atualizados pela importação.

Campos do ponto: parceiro, nome, descrição, endereço, localização (lat/lng), potência (kW),
preço por kWh (R$, guardado em centavos), conectores (CCS2, Tipo 2 (cabo),
Tipo 2 (tomada), CHAdeMO, GB/T AC, GB/T DC, Tipo 1, CCS1), horário de funcionamento,
ativo.

## Telas

| Rota | Tela |
|---|---|
| `/login` | E-mail e senha, identidade visual do app |
| `/` (Visão geral) | Indicadores: parceiros ativos, pontos por origem e situação, motoristas, recargas/energia/valor do mês; parceiros recentes e atalhos |
| `/partners` | Tabela de parceiros (nome, CNPJ, contato, pontos, situação); criar/editar em diálogo; ativar/desativar; excluir com confirmação |
| `/charge-points` | Tabela de pontos com filtros (parceiros/públicos, parceiro, busca por nome) |
| `/charge-points/new`, `/charge-points/[id]` | Formulário do ponto com busca de endereço e mapa: o pino pode ser arrastado para ajustar a posição |

## Critérios de aceite

- Testes da API: CRUD de parceiros e pontos, validação de CNPJ, 403 para motorista,
  401 sem sessão, pontos públicos protegidos, exclusão de parceiro mantendo o histórico.
- No navegador: entrar como admin, criar um parceiro e um ponto posicionado pelo mapa,
  ver o ponto novo no mapa do app no iPhone, desativar e ver sumir do app.
- Motorista não consegue usar o painel.
- Lint, typecheck e build do Next sem erros.

## Fora do escopo (futuro)

Portal para o próprio parceiro gerenciar seus pontos, upload de fotos, relatórios de uso
por ponto, gestão de usuários pelo painel, deploy.
