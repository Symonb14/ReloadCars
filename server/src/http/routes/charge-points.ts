import { and, eq, or, type SQL, sql } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db } from '../../db/client.ts'
import { chargePoint, chargePointSources, partner } from '../../db/schema/index.ts'
import type { Point } from '../../db/schema/point.ts'
import { requireAuth } from '../require-auth.ts'
import { latitude, longitude } from '../schemas.ts'

const chargePointSchema = z.object({
  id: z.string(),
  source: z.enum(chargePointSources),
  name: z.string(),
  description: z.string().nullable(),
  address: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  powerKw: z.number().nullable(),
  pricePerKwhCents: z.number().int().nullable(),
  connectors: z.array(z.string()),
  openingHours: z.string().nullable(),
  attribution: z.string().nullable(),
  partnerName: z.string().nullable(),
})

const nearbyChargePointSchema = chargePointSchema.extend({
  distanceMeters: z.number().int(),
})

const notFoundSchema = z.object({ message: z.string() })

const MAX_RESULTS = 200

/** Active points whose partner (if any) is also active. */
const isListed = and(
  eq(chargePoint.active, true),
  or(eq(chargePoint.source, 'ocm'), eq(partner.active, true)),
)

const columns = {
  id: chargePoint.id,
  source: chargePoint.source,
  name: chargePoint.name,
  description: chargePoint.description,
  address: chargePoint.address,
  location: chargePoint.location,
  powerKw: chargePoint.powerKw,
  pricePerKwhCents: chargePoint.pricePerKwhCents,
  connectors: chargePoint.connectors,
  openingHours: chargePoint.openingHours,
  attribution: chargePoint.attribution,
  partnerName: partner.name,
}

/** Flattens the PostGIS point into latitude/longitude fields. */
function toResponse<T extends { location: Point }>({ location, ...row }: T) {
  return { ...row, latitude: location.latitude, longitude: location.longitude }
}

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
        .select({ ...columns, distanceMeters: sql<number>`round(${distance})::int` })
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

      return { chargePoints: rows.map(toResponse) }
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
        .select(columns)
        .from(chargePoint)
        .leftJoin(partner, eq(partner.id, chargePoint.partnerId))
        .where(and(isListed, eq(chargePoint.id, request.params.id)))

      if (!row) return reply.status(404).send({ message: 'Charge point not found' })

      return toResponse(row)
    },
  )
}
