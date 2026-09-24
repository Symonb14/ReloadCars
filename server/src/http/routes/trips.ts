import { and, eq, sql } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db } from '../../db/client.ts'
import { chargePoint, partner } from '../../db/schema/index.ts'
import { type DrivingRoute, getDrivingRoute, MapboxError } from '../../lib/mapbox.ts'
import {
  chargePointColumns,
  chargePointSchema,
  isListed,
  toChargePointResponse,
} from '../charge-point-response.ts'
import { requireAuth } from '../require-auth.ts'
import { coordinatesSchema, latitude, longitude } from '../schemas.ts'

const messageSchema = z.object({ message: z.string() })

const MAX_RESULTS = 200

export const tripsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/trips',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['trips'],
        operationId: 'getTrip',
        summary: 'Rota até o destino com os pontos de recarga no caminho (RF05, RF07)',
        querystring: z.object({
          fromLat: latitude,
          fromLng: longitude,
          toLat: latitude,
          toLng: longitude,
          corridorKm: z.coerce.number().positive().max(10).default(2),
        }),
        response: {
          200: z.object({
            route: z.object({
              distanceMeters: z.number().int(),
              durationSeconds: z.number().int(),
              coordinates: z.array(coordinatesSchema),
            }),
            chargePoints: z.array(
              chargePointSchema.extend({
                distanceFromRouteMeters: z.number().int(),
                distanceAlongRouteMeters: z.number().int(),
              }),
            ),
          }),
          404: messageSchema,
          502: messageSchema,
        },
      },
    },
    async (request, reply) => {
      const { fromLat, fromLng, toLat, toLng, corridorKm } = request.query

      let route: DrivingRoute | null
      try {
        route = await getDrivingRoute(
          { latitude: fromLat, longitude: fromLng },
          { latitude: toLat, longitude: toLng },
        )
      } catch (error) {
        if (!(error instanceof MapboxError)) throw error
        request.log.error(error)
        return reply.status(502).send({ message: 'Routing provider unavailable' })
      }

      if (!route) return reply.status(404).send({ message: 'No route found' })

      return {
        route,
        chargePoints: await findChargePointsAlongRoute(route, corridorKm * 1000),
      }
    },
  )
}

/** Listed charge points within `corridorMeters` of the route, in driving order. */
async function findChargePointsAlongRoute(route: DrivingRoute, corridorMeters: number) {
  const lineGeoJson = JSON.stringify({
    type: 'LineString',
    coordinates: route.coordinates.map((c) => [c.longitude, c.latitude]),
  })

  // The (possibly long) line is sent once and referenced as route_line.geom.
  const routeLine = sql`(select ST_SetSRID(ST_GeomFromGeoJSON(${lineGeoJson}), 4326) as geom) as route_line`
  const geom = sql.raw('route_line.geom')

  // Fraction (0..1) of the route where the point projects onto it.
  const position = sql<number>`ST_LineLocatePoint(${geom}, ${chargePoint.location})`

  const rows = await db
    .select({
      ...chargePointColumns,
      distanceFromRouteMeters: sql<number>`round(ST_Distance(${chargePoint.location}::geography, ${geom}::geography))::int`,
      distanceAlongRouteMeters: sql<number>`round(${position} * ${route.distanceMeters})::int`,
    })
    .from(chargePoint)
    .leftJoin(partner, eq(partner.id, chargePoint.partnerId))
    .innerJoin(routeLine, sql`true`)
    .where(
      and(
        isListed,
        sql`ST_DWithin(${chargePoint.location}::geography, ${geom}::geography, ${corridorMeters})`,
      ),
    )
    .orderBy(position)
    .limit(MAX_RESULTS)

  return rows.map(toChargePointResponse)
}
