import { sql } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db } from '../../db/client.ts'
import { chargePoint, partner, reload, user } from '../../db/schema/index.ts'

// "This month" follows Brasília time, like the drivers' summary (GET /reloads).
const startOfMonthInBrazil = sql`date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'`

/** Registered under /admin, behind the admin role check. */
export const adminOverviewRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/overview',
    {
      schema: {
        tags: ['admin'],
        operationId: 'adminGetOverview',
        summary: 'Indicadores da Visão geral do painel',
        response: {
          200: z.object({
            partners: z.object({ total: z.number().int(), active: z.number().int() }),
            chargePoints: z.object({
              partner: z.number().int(),
              public: z.number().int(),
              active: z.number().int(),
              inactive: z.number().int(),
            }),
            drivers: z.number().int(),
            reloadsThisMonth: z.object({
              count: z.number().int(),
              energyKwh: z.number(),
              totalCents: z.number().int(),
            }),
          }),
        },
      },
    },
    async () => {
      const [[partners], [chargePoints], [drivers], [reloadsThisMonth]] =
        await Promise.all([
          db
            .select({
              total: sql<number>`count(*)::int`,
              active: sql<number>`count(*) filter (where ${partner.active})::int`,
            })
            .from(partner),
          db
            .select({
              partner: sql<number>`count(*) filter (where ${chargePoint.source} = 'partner')::int`,
              public: sql<number>`count(*) filter (where ${chargePoint.source} = 'ocm')::int`,
              active: sql<number>`count(*) filter (where ${chargePoint.active})::int`,
              inactive: sql<number>`count(*) filter (where not ${chargePoint.active})::int`,
            })
            .from(chargePoint),
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(user)
            .where(sql`${user.role} = 'driver'`),
          db
            .select({
              count: sql<number>`count(*)::int`,
              energyKwh: sql<number>`coalesce(sum(${reload.energyKwh}), 0)::float8`,
              totalCents: sql<number>`coalesce(sum(${reload.totalCents}), 0)::int`,
            })
            .from(reload)
            .where(sql`${reload.chargedAt} >= ${startOfMonthInBrazil}`),
        ])

      return {
        partners: partners ?? { total: 0, active: 0 },
        chargePoints: chargePoints ?? { partner: 0, public: 0, active: 0, inactive: 0 },
        drivers: drivers?.count ?? 0,
        reloadsThisMonth: reloadsThisMonth ?? { count: 0, energyKwh: 0, totalCents: 0 },
      }
    },
  )
}
