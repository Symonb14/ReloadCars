import { defineConfig } from 'orval'

// Typed TanStack Query hooks for the routes the admin panel uses.
// Regenerate after API changes: `cd ../server && npm run openapi`, then `npm run api`.
export default defineConfig({
  reloadcars: {
    input: {
      target: '../server/openapi.json',
      filters: { tags: ['admin', 'places', 'profile'] },
    },
    output: {
      mode: 'tags-split',
      target: 'src/api/generated',
      schemas: 'src/api/generated/models',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      override: {
        mutator: { path: 'src/api/fetcher.ts', name: 'fetcher' },
        fetch: { includeHttpResponseReturnType: false },
        query: { signal: true },
      },
    },
    hooks: { afterAllFilesWrite: 'biome check --write' },
  },
})
