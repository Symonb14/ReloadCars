# ReloadCars — Painel admin

Next.js 16 + Tailwind v4 + shadcn/ui (Base UI) + TanStack Query/Orval + MapLibre
(OpenFreeMap). Especificação em [`../specs/07-painel-admin.md`](../specs/07-painel-admin.md).

## Como rodar

1. Suba a API (veja [`../server/README.md`](../server/README.md)).
2. Crie uma conta admin (o cadastro pelo app sempre cria motoristas):

   ```bash
   cd ../server
   npm run create-admin -- --email admin@reloadcars.com --name "Admin" --password "sua-senha"
   ```

3. Rode o painel:

   ```bash
   cp .env.example .env.local
   npm install
   npm run dev          # http://localhost:3000
   ```

O navegador fala só com o painel: `/backend/*` é encaminhado para a API (`API_URL`) pelo
`next.config.ts`, então o cookie de sessão é do próprio painel (sem CORS).

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Painel em modo de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run lint` / `npm run format` | Verifica / corrige com Biome |
| `npm run typecheck` | Checa os tipos |
| `npm run api` | Regenera os hooks da API em `src/api/generated` a partir de `../server/openapi.json` |

Componentes de interface: `npx shadcn@latest add <componente>`.
