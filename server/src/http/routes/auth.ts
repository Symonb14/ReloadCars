import { fromNodeHeaders } from 'better-auth/node'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { auth } from '../../auth.ts'
import { env } from '../../env.ts'

/**
 * Forwards /api/auth/* to Better Auth, converting Fastify's request into a Fetch
 * Request and copying the Fetch Response back (including every Set-Cookie).
 */
export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    schema: { hide: true },
    async handler(request, reply) {
      const url = new URL(request.url, env.BETTER_AUTH_URL)

      const response = await auth.handler(
        new Request(url, {
          method: request.method,
          headers: fromNodeHeaders(request.headers),
          body: request.body ? JSON.stringify(request.body) : undefined,
        }),
      )

      reply.status(response.status)

      for (const [key, value] of response.headers) {
        if (key !== 'set-cookie') reply.header(key, value)
      }

      const cookies = response.headers.getSetCookie()
      if (cookies.length > 0) reply.header('set-cookie', cookies)

      return reply.send(response.body ? await response.text() : null)
    },
  })
}
