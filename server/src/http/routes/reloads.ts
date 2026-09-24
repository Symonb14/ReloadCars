import { and, desc, eq, sql } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db } from '../../db/client.ts'
import { chargePoint, partner, reload } from '../../db/schema/index.ts'
import { calculateReload, EnergyUnknownError } from '../../lib/reload-calculation.ts'
import { isListed } from '../charge-point-response.ts'
import { getSession, requireAuth } from '../require-auth.ts'

const messageSchema = z.object({ message: z.string() })

const reloadSchema = z.object({
  id: z.string(),
  chargePointId: z.string().nullable(),
  chargePointName: z.string(),
  chargePointAddress: z.string().nullable(),
  chargedAt: z.date(),
  durationMinutes: z.number().int(),
  energyKwh: z.number(),
  energyEstimated: z.boolean(),
  pricePerKwhCents: z.number().int().nullable(),
  totalCents: z.number().int().nullable(),
})

const reloadColumns = {
  id: reload.id,
  chargePointId: reload.chargePointId,
  chargePointName: reload.chargePointName,
  chargePointAddress: reload.chargePointAddress,
  chargedAt: reload.chargedAt,
  durationMinutes: reload.durationMinutes,
  energyKwh: reload.energyKwh,
  energyEstimated: reload.energyEstimated,
  pricePerKwhCents: reload.pricePerKwhCents,
  totalCents: reload.totalCents,
}

const HISTORY_LIMIT = 100

// "This month" follows Brasília time, not the server's clock.
const startOfMonthInBrazil = sql`date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'`

export const reloadRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/reloads',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['reloads'],
        operationId: 'createReload',
        summary: 'Registra uma recarga com energia e valor calculados (RF11, RF06)',
        body: z.object({
          chargePointId: z.string().min(1),
          durationMinutes: z.number().int().min(1).max(1440),
          energyKwh: z.number().positive().max(500).optional(),
          pricePerKwhCents: z.number().int().min(0).max(10_000).optional(),
        }),
        response: { 201: reloadSchema, 400: messageSchema, 404: messageSchema },
      },
    },
    async (request, reply) => {
      const { user } = getSession(request)
      const { chargePointId, ...input } = request.body

      const [point] = await db
        .select({
          id: chargePoint.id,
          name: chargePoint.name,
          address: chargePoint.address,
          powerKw: chargePoint.powerKw,
          pricePerKwhCents: chargePoint.pricePerKwhCents,
        })
        .from(chargePoint)
        .leftJoin(partner, eq(partner.id, chargePoint.partnerId))
        .where(and(isListed, eq(chargePoint.id, chargePointId)))

      if (!point) return reply.status(404).send({ message: 'Charge point not found' })

      let calculation: ReturnType<typeof calculateReload>
      try {
        calculation = calculateReload(input, point)
      } catch (error) {
        if (!(error instanceof EnergyUnknownError)) throw error
        return reply.status(400).send({
          message: 'Informe a energia (kWh): este ponto não tem potência cadastrada.',
        })
      }

      const [created] = await db
        .insert(reload)
        .values({
          userId: user.id,
          chargePointId: point.id,
          chargePointName: point.name,
          chargePointAddress: point.address,
          durationMinutes: input.durationMinutes,
          ...calculation,
        })
        .returning(reloadColumns)

      if (!created) throw new Error('Insert into reload returned no row')
      return reply.status(201).send(created)
    },
  )

  app.get(
    '/reloads',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['reloads'],
        operationId: 'getReloads',
        summary: 'Histórico de recargas e resumo do mês (RF12)',
        response: {
          200: z.object({
            reloads: z.array(reloadSchema),
            month: z.object({
              count: z.number().int(),
              energyKwh: z.number(),
              totalCents: z.number().int(),
            }),
          }),
        },
      },
    },
    async (request) => {
      const { user } = getSession(request)

      const [reloads, [month]] = await Promise.all([
        db
          .select(reloadColumns)
          .from(reload)
          .where(eq(reload.userId, user.id))
          .orderBy(desc(reload.chargedAt))
          .limit(HISTORY_LIMIT),
        db
          .select({
            count: sql<number>`count(*)::int`,
            energyKwh: sql<number>`coalesce(sum(${reload.energyKwh}), 0)::float8`,
            totalCents: sql<number>`coalesce(sum(${reload.totalCents}), 0)::int`,
          })
          .from(reload)
          .where(
            and(
              eq(reload.userId, user.id),
              sql`${reload.chargedAt} >= ${startOfMonthInBrazil}`,
            ),
          ),
      ])

      return {
        reloads,
        month: month ?? { count: 0, energyKwh: 0, totalCents: 0 },
      }
    },
  )

  app.delete(
    '/reloads/:id',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['reloads'],
        operationId: 'deleteReload',
        summary: 'Exclui uma recarga do próprio histórico',
        params: z.object({ id: z.string() }),
        response: { 204: z.null(), 404: messageSchema },
      },
    },
    async (request, reply) => {
      const { user } = getSession(request)

      const deleted = await db
        .delete(reload)
        .where(and(eq(reload.id, request.params.id), eq(reload.userId, user.id)))
        .returning({ id: reload.id })

      if (deleted.length === 0) {
        return reply.status(404).send({ message: 'Reload not found' })
      }
      return reply.status(204).send(null)
    },
  )
}
