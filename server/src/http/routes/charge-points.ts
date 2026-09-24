import { and, eq, type SQL, sql } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db } from '../../db/client.ts'
import { chargePoint, partner } from '../../db/schema/index.ts'
import {
  chargePointColumns,
  chargePointSchema,
  isListed,
  toChargePointResponse,
} from '../charge-point-response.ts'
import { requireAuth } from '../require-auth.ts'
import { latitude, longitude } from '../schemas.ts'

const nearbyChargePointSchema = chargePointSchema.extend({
  distanceMeters: z.number().int(),
})

const notFoundSchema = z.object({ message: z.string() })

const MAX_RESULTS = 200

export const chargePointRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/charge-points/nearby',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['charge-points'],
        operationId: 'getNearbyChargePoints',
        summary: 'Pontos de recarga próximos, do mais perto ao mais longe (RF08)',
        querystring: z.object({
          lat: latitude,
          lng: longitude,
          radiusKm: z.coerce.number().positive().max(50).default(10),
        }),
        response: { 200: z.object({ chargePoints: z.array(nearbyChargePointSchema) }) },
      },
    },
    async (request) => {
      const { lat, lng, radiusKm } = request.query
      const origin = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`
      const distance: SQL<number> = sql`ST_Distance(${chargePoint.location}::geography, ${origin})`

      const rows = await db
        .select({
          ...chargePointColumns,
          distanceMeters: sql<number>`round(${distance})::int`,
        })
        .from(chargePoint)
        .leftJoin(partner, eq(partner.id, chargePoint.partnerId))
        .where(
          and(
            isListed,
            sql`ST_DWithin(${chargePoint.location}::geography, ${origin}, ${radiusKm * 1000})`,
          ),
        )
        .orderBy(distance)
        .limit(MAX_RESULTS)

      return { chargePoints: rows.map(toChargePointResponse) }
    },
  )

  app.get(
    '/charge-points/:id',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['charge-points'],
        operationId: 'getChargePoint',
        summary: 'Detalhes de um ponto de recarga',
        params: z.object({ id: z.string() }),
        response: { 200: chargePointSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const [row] = await db
        .select(chargePointColumns)
        .from(chargePoint)
        .leftJoin(partner, eq(partner.id, chargePoint.partnerId))
        .where(and(isListed, eq(chargePoint.id, request.params.id)))

      if (!row) return reply.status(404).send({ message: 'Charge point not found' })

      return toChargePointResponse(row)
    },
  )
}
