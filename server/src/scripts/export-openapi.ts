/**
 * Writes the API's OpenAPI document to openapi.json. The mobile app (and later the
 * web panel) generate their typed clients from this file.
 *
 *   npm run openapi
 */
import { writeFile } from 'node:fs/promises'
import { buildApp } from '../app.ts'

const app = buildApp()
await app.ready()

const document = app.swagger()
await writeFile(
  new URL('../../openapi.json', import.meta.url),
  `${JSON.stringify(document, null, 2)}\n`,
)

console.log(`openapi.json: ${Object.keys(document.paths ?? {}).length} rotas.`)
await app.close()
process.exit(0)
