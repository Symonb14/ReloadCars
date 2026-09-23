# Etapa 1 — API base

Substitui o `server/` de 2023 (Prisma + SQLite + login pelo GitHub) por uma API nova.
Atende RF01–RF04 e RNF05–RNF07.

## Stack

- Node 24 rodando TypeScript direto (`node --watch src/server.ts`), ESM, sem build
- Fastify 5 + `fastify-type-provider-zod` + Zod 4
- Drizzle ORM + PostgreSQL 18 com PostGIS 3.6 (Docker Compose)
- Better Auth: e-mail/senha, plugin `admin` (perfis), plugin `expo` (app mobile)
- Documentação OpenAPI com Scalar em `/docs`
- Vitest (testes de integração com banco de teste), Biome

## Estrutura

```
server/
  docker-compose.yml     # postgis + banco de teste
  docker/init.sql        # cria reloadcars_test
  drizzle.config.ts
  src/
    env.ts               # variáveis de ambiente validadas com Zod
    app.ts               # monta o Fastify (usado pelo server e pelos testes)
    server.ts            # sobe o servidor
    auth.ts              # configuração da Better Auth
    db/
      client.ts
      schema/            # tabelas (auth.ts gerado pela CLI da Better Auth)
      migrations/
    http/
      require-auth.ts    # exige sessão e, opcionalmente, um perfil
      routes/            # health, auth, me
    scripts/
      create-admin.ts    # promove/cria um usuário admin
  test/
```

## Autenticação

- Rotas da Better Auth em `/api/auth/*`. As usadas pelos requisitos:
  - RF01 login: `POST /api/auth/sign-in/email`
  - RF02 cadastro: `POST /api/auth/sign-up/email` (a confirmação de senha é validada no app)
  - RF03 perfil: `GET /me` (rota própria, protegida)
  - RF04 alterar dados: `POST /api/auth/update-user` e `POST /api/auth/change-password`
- Perfis: `driver` (padrão no cadastro) e `admin`. O perfil nunca vem do corpo da
  requisição; admin só é criado pelo script `npm run create-admin`.
- Senhas com hash da Better Auth (scrypt). Sessão por cookie; o app mobile guarda o cookie
  no SecureStore através do plugin `expo`.

## Rotas próprias

| Método | Rota | Acesso | Resposta |
|---|---|---|---|
| GET | `/health` | público | `{ status: 'ok' }` |
| GET | `/me` | logado | `{ id, name, email, role, createdAt }` |

## Critérios de aceite

- `docker compose up -d` sobe o banco; `npm run db:migrate` cria as tabelas.
- Cadastro, login e `/me` funcionam; `/me` sem sessão retorna 401.
- Um cadastro que tente enviar `role: 'admin'` continua `driver`.
- `npm test` passa contra o banco de teste; `npm run lint` e `npm run typecheck` sem erros.
- Documentação navegável em `http://localhost:3333/docs`.
