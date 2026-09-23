# ReloadCars

App para motoristas de veículos elétricos encontrarem pontos de recarga de estabelecimentos
parceiros, verem a rota até eles e registrarem suas recargas. Especificação em `specs/`
(comece por `specs/00-visao-geral.md` e `specs/01-roadmap.md`).

## Estrutura

Projetos independentes por área, cada um com seu próprio `package.json` e sem ferramentas
de monorepo:

- `server/` — API (Fastify 5, Zod 4, Drizzle, PostgreSQL + PostGIS, Better Auth)
- `mobile/` — app do motorista (Expo, Expo Router, react-native-maps, expo-location, Uniwind,
  TanStack Query, react-hook-form)
- `web/` — painel do admin (Next.js 16, Tailwind v4, TanStack Query)

Os tipos compartilhados vêm do OpenAPI gerado pela API; não há pacote compartilhado.

## Convenções

- Comunicação, specs e textos da interface em português; código (nomes e comentários) em
  inglês, como no código existente.
- TypeScript estrito. Biome para lint e formatação.
- Toda funcionalidade nova começa por uma spec em `specs/`.
- Dinheiro em centavos (inteiro); energia em `numeric`; coordenadas como PostGIS
  `geometry(Point, 4326)`.
- Segredos só em `.env` (nunca versionado); cada projeto mantém um `.env.example`.
- Commit e push apenas quando o usuário pedir.
