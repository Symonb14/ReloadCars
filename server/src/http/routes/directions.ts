import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { getDrivingRoute, MapboxError } from '../../lib/mapbox.ts'
import { requireAuth } from '../require-auth.ts'
import { coordinatesSchema, latitude, longitude } from '../schemas.ts'

const messageSchema = z.object({ message: z.string() })

export const directionsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/directions',
    {
      onRequest: requireAuth(),
      schema: {
        tags: ['directions'],
        operationId: 'getDirections',
        summary: 'Rota de carro entre dois pontos (RF09)',
        querystring: z.object({
          fromLat: latitude,
          fromLng: longitude,
          toLat: latitude,
          toLng: longitude,
        }),
        response: {
          200: z.object({
            distanceMeters: z.number().int(),
            durationSeconds: z.number().int(),
            coordinates: z.array(coordinatesSchema),
          }),
          404: messageSchema,
          502: messageSchema,
        },
      },
    },
    async (request, reply) => {
      const { fromLat, fromLng, toLat, toLng } = request.query

      try {
        const route = await getDrivingRoute(
          { latitude: fromLat, longitude: fromLng },
          { latitude: toLat, longitude: toLng },
        )

        if (!route) return reply.status(404).send({ message: 'No route found' })
        return route
      } catch (error) {
        if (error instanceof MapboxError) {
          request.log.error(error)
          return reply.status(502).send({ message: 'Routing provider unavailable' })
        }
        throw error
      }
    },
  )
}
