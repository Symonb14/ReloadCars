# ReloadCars — API

Fastify 5 + Zod 4 + Drizzle + PostgreSQL/PostGIS + Better Auth. Especificação em
[`../specs/02-api-base.md`](../specs/02-api-base.md).

## Como rodar

Requisitos: Node 24+ e Docker.

```bash
cp .env.example .env        # e preencha BETTER_AUTH_SECRET (o comando está no arquivo)
npm install
docker compose up -d        # Postgres + PostGIS na porta 5433
npm run db:migrate
npm run dev                 # http://localhost:3333 — documentação em /docs
```

A porta do banco é 5433 para não conflitar com outro Postgres local na 5432.

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Sobe a API recarregando a cada alteração |
| `npm test` | Aplica as migrações no banco de teste e roda os testes |
| `npm run lint` / `npm run format` | Verifica / corrige com Biome |
| `npm run typecheck` | Checa os tipos |
| `npm run db:generate -- --name <nome>` | Gera uma migração a partir do schema |
| `npm run db:migrate` | Aplica as migrações |
| `npm run db:studio` | Abre o Drizzle Studio |
| `npm run auth:generate` | Regenera `src/db/schema/auth.ts` a partir da Better Auth (reaplique o ajuste do `role`, marcado no arquivo) |
| `npm run create-admin -- --email <e-mail> [--name <nome>] [--password <senha>]` | Cria um admin ou promove uma conta existente |

## Documentação

- `/docs` — rotas próprias da API (Scalar)
- `/api/auth/reference` — rotas da Better Auth (fora de produção)
