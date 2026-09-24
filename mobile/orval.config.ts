import { defineConfig } from 'orval'

// Generates typed TanStack Query hooks from the API's OpenAPI document.
// Regenerate after API changes: `cd ../server && npm run openapi`, then `npm run api`.
export default defineConfig({
  reloadcars: {
    input: { target: '../server/openapi.json' },
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
        query: { useQuery: true, signal: true },
      },
    },
    hooks: { afterAllFilesWrite: 'biome check --write' },
  },
})
