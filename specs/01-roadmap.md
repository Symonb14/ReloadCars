# Roadmap da reconstrução

Cada etapa ganha uma spec própria em `specs/` antes de ser implementada. O código de 2023
(Expo 48, Prisma + SQLite, login pelo GitHub) fica no histórico do git e é substituído
pasta por pasta.

| Etapa | Entrega | Requisitos |
|---|---|---|
| 1. API base ✅ | `server/`: Fastify 5 + Zod 4 + Drizzle + PostgreSQL/PostGIS (Docker) + Better Auth (e-mail/senha, perfis) + docs Scalar + Vitest | RF01–RF04, RNF05–RNF07 |
| 2. Mobile base ✅ | `mobile/`: Expo (SDK atual) + Expo Router + Uniwind; telas de login, cadastro e perfil | RF01–RF04 |
| 3. Pontos e mapa | API de pontos com busca por proximidade (PostGIS) + seed; aba Localização com mapa, pins, rota e "Como chegar" | RF05, RF07–RF10, RNF01 |
| 4. Recargas | Registrar recarga com cálculo automático; aba Recargas com histórico | RF06, RF11, RF12 |
| 5. Painel admin | `web/`: Next.js 16 + Tailwind v4; login de admin; CRUD de parceiros e pontos | RF13, RF14, RNF02 |
| 6. Evoluções | Pagamentos, recompensas, destaque para parceiros, Open Charge Map | — |

Até a etapa 5 ficar pronta, os pontos de recarga entram no banco por um seed, para que o
mobile avance sem depender do painel.
