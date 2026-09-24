import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { roles } from '../../auth.ts'
import { getSession, requireAuth } from '../require-auth.ts'

export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/me',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['profile'],
        operationId: 'getMe',
        summary: 'Perfil do usuário logado (RF03)',
        response: {
          200: z.object({
            id: z.string(),
            name: z.string(),
            email: z.email(),
            role: z.enum(roles),
            createdAt: z.date(),
          }),
          401: z.object({ message: z.string() }),
        },
      },
    },
    async (request) => {
      const { user } = getSession(request)

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: z.enum(roles).parse(user.role),
        createdAt: user.createdAt,
      }
    },
  )
}
