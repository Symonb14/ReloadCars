import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { MapboxError, retrievePlace, suggestPlaces } from '../../lib/mapbox.ts'
import { requireAuth } from '../require-auth.ts'
import { latitude, longitude } from '../schemas.ts'

const messageSchema = z.object({ message: z.string() })

// One UUID per search in the app; Mapbox bills all its calls as one session.
const sessionToken = z.uuid()

export const placesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/places/suggestions',
    {
      onRequest: requireAuth(),
      schema: {
        tags: ['places'],
        operationId: 'getPlaceSuggestions',
        summary: 'Sugestões de destino enquanto o usuário digita (RF05)',
        querystring: z.object({
          q: z.string().trim().min(3).max(200),
          sessionToken,
          lat: latitude.optional(),
          lng: longitude.optional(),
        }),
        response: {
          200: z.object({
            suggestions: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                address: z.string().nullable(),
                type: z.string(),
              }),
            ),
          }),
          502: messageSchema,
        },
      },
    },
    async (request, reply) => {
      const { q, sessionToken, lat, lng } = request.query

      try {
        const suggestions = await suggestPlaces({
          query: q,
          sessionToken,
          proximity:
            lat !== undefined && lng !== undefined
              ? { latitude: lat, longitude: lng }
              : undefined,
        })
        return { suggestions }
      } catch (error) {
        if (!(error instanceof MapboxError)) throw error
        request.log.error(error)
        return reply.status(502).send({ message: 'Search provider unavailable' })
      }
    },
  )

  app.get(
    '/places/:id',
    {
      onRequest: requireAuth(),
      schema: {
        tags: ['places'],
        operationId: 'getPlace',
        summary: 'Coordenadas do destino escolhido',
        params: z.object({ id: z.string().min(1) }),
        querystring: z.object({ sessionToken }),
        response: {
          200: z.object({
            id: z.string(),
            name: z.string(),
            address: z.string().nullable(),
            latitude: z.number(),
            longitude: z.number(),
          }),
          404: messageSchema,
          502: messageSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const place = await retrievePlace(request.params.id, request.query.sessionToken)
        if (!place) return reply.status(404).send({ message: 'Place not found' })
        return place
      } catch (error) {
        if (!(error instanceof MapboxError)) throw error
        request.log.error(error)
        return reply.status(502).send({ message: 'Search provider unavailable' })
      }
    },
  )
}
