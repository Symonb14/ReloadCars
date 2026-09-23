import { buildApp } from './app.ts'
import { env } from './env.ts'

const app = buildApp()

await app.listen({ port: env.PORT, host: '0.0.0.0' })

console.log(`HTTP server running on http://localhost:${env.PORT} (docs at /docs)`)
