import { and, asc, desc, eq, ilike, type SQL, sql } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db } from '../../db/client.ts'
import { chargePoint, chargePointSources, partner } from '../../db/schema/index.ts'
import { connectorTypes } from '../../lib/connectors.ts'
import {
  chargePointColumns,
  chargePointSchema,
  toChargePointResponse,
} from '../charge-point-response.ts'

const messageSchema = z.object({ message: z.string() })

const adminChargePointSchema = chargePointSchema.extend({
  partnerId: z.string().nullable(),
  active: z.boolean(),
})

const optionalText = z.string().trim().max(500).nullable().optional()

const chargePointBody = z.object({
  partnerId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  description: optionalText,
  address: optionalText,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  powerKw: z.number().positive().max(1000).nullable().optional(),
  pricePerKwhCents: z.number().int().min(0).max(10_000).nullable().optional(),
  connectors: z.array(z.enum(connectorTypes)).max(connectorTypes.length).default([]),
  openingHours: z.string().trim().max(200).nullable().optional(),
  active: z.boolean().optional(),
})

const PUBLIC_POINT_MESSAGE =
  'Pontos públicos são atualizados pela importação do Open Charge Map e não podem ser alterados pelo painel.'

const adminColumns = {
  ...chargePointColumns,
  partnerId: chargePoint.partnerId,
  active: chargePoint.active,
}

async function findChargePoint(id: string) {
  const [row] = await db
    .select(adminColumns)
    .from(chargePoint)
    .leftJoin(partner, eq(partner.id, chargePoint.partnerId))
    .where(eq(chargePoint.id, id))
  return row
}

/** Moves latitude/longitude from the body into the PostGIS point. */
function toRow<T extends { latitude?: number; longitude?: number }>({
  latitude,
  longitude,
  ...fields
}: T) {
  return {
    ...fields,
    ...(latitude !== undefined && longitude !== undefined
      ? { location: { latitude, longitude } }
      : {}),
  }
}

async function partnerExists(id: string) {
  const [row] = await db
    .select({ id: partner.id })
    .from(partner)
    .where(eq(partner.id, id))
  return Boolean(row)
}

/** Registered under /admin, behind the admin role check (RF14). */
export const adminChargePointRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/charge-points',
    {
      schema: {
        tags: ['admin'],
        operationId: 'adminListChargePoints',
        summary:
          'Lista os pontos (parceiros primeiro, depois públicos), com filtros e paginação',
        querystring: z.object({
          source: z.enum(chargePointSources).optional(),
          partnerId: z.string().optional(),
          q: z.string().trim().max(100).optional(),
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(50),
        }),
        response: {
          200: z.object({
            chargePoints: z.array(adminChargePointSchema),
            total: z.number().int(),
            page: z.number().int(),
            pageSize: z.number().int(),
          }),
        },
      },
    },
    async (request) => {
      const { source, partnerId, q, page, pageSize } = request.query
      const filters: SQL[] = []
      if (source) filters.push(eq(chargePoint.source, source))
      if (partnerId) filters.push(eq(chargePoint.partnerId, partnerId))
      if (q) filters.push(ilike(chargePoint.name, `%${q}%`))

      const where = and(...filters)
      const [rows, [count]] = await Promise.all([
        db
          .select(adminColumns)
          .from(chargePoint)
          .leftJoin(partner, eq(partner.id, chargePoint.partnerId))
          .where(where)
          // id breaks ties so pages never repeat or skip points with the same name.
          .orderBy(
            desc(sql`${chargePoint.source} = 'partner'`),
            asc(chargePoint.name),
            asc(chargePoint.id),
          )
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db.select({ total: sql<number>`count(*)::int` }).from(chargePoint).where(where),
      ])

      return {
        chargePoints: rows.map(toChargePointResponse),
        total: count?.total ?? 0,
        page,
        pageSize,
      }
    },
  )

  app.get(
    '/charge-points/:id',
    {
      schema: {
        tags: ['admin'],
        operationId: 'adminGetChargePoint',
        summary: 'Detalhe de um ponto (inclusive inativo)',
        params: z.object({ id: z.string() }),
        response: { 200: adminChargePointSchema, 404: messageSchema },
      },
    },
    async (request, reply) => {
      const row = await findChargePoint(request.params.id)
      if (!row) return reply.status(404).send({ message: 'Charge point not found' })
      return toChargePointResponse(row)
    },
  )

  app.post(
    '/charge-points',
    {
      schema: {
        tags: ['admin'],
        operationId: 'adminCreateChargePoint',
        summary: 'Cria um ponto de recarga de um parceiro',
        body: chargePointBody,
        response: { 201: adminChargePointSchema, 400: messageSchema },
      },
    },
    async (request, reply) => {
      if (!(await partnerExists(request.body.partnerId))) {
        return reply.status(400).send({ message: 'Parceiro não encontrado.' })
      }

      const { latitude, longitude, ...fields } = request.body
      const [created] = await db
        .insert(chargePoint)
        .values({ ...fields, source: 'partner', location: { latitude, longitude } })
        .returning({ id: chargePoint.id })

      const row = created && (await findChargePoint(created.id))
      if (!row) throw new Error('Charge point not found after insert')
      return reply.status(201).send(toChargePointResponse(row))
    },
  )

  app.patch(
    '/charge-points/:id',
    {
      schema: {
        tags: ['admin'],
        operationId: 'adminUpdateChargePoint',
        summary: 'Edita um ponto de parceiro',
        params: z.object({ id: z.string() }),
        body: chargePointBody
          .partial()
          .refine(
            (body) => (body.latitude === undefined) === (body.longitude === undefined),
            'Envie latitude e longitude juntas.',
          ),
        response: {
          200: adminChargePointSchema,
          400: messageSchema,
          404: messageSchema,
          409: messageSchema,
        },
      },
    },
    async (request, reply) => {
      const existing = await findChargePoint(request.params.id)
      if (!existing) return reply.status(404).send({ message: 'Charge point not found' })
      if (existing.source === 'ocm') {
        return reply.status(409).send({ message: PUBLIC_POINT_MESSAGE })
      }
      if (request.body.partnerId && !(await partnerExists(request.body.partnerId))) {
        return reply.status(400).send({ message: 'Parceiro não encontrado.' })
      }

      const changes = toRow(request.body)
      if (Object.keys(changes).length === 0) return toChargePointResponse(existing)

      await db
        .update(chargePoint)
        .set(changes)
        .where(eq(chargePoint.id, request.params.id))

      const row = await findChargePoint(request.params.id)
      if (!row) return reply.status(404).send({ message: 'Charge point not found' })
      return toChargePointResponse(row)
    },
  )

  app.delete(
    '/charge-points/:id',
    {
      schema: {
        tags: ['admin'],
        operationId: 'adminDeleteChargePoint',
        summary: 'Exclui um ponto de parceiro (o histórico de recargas é mantido)',
        params: z.object({ id: z.string() }),
        response: { 204: z.null(), 404: messageSchema, 409: messageSchema },
      },
    },
    async (request, reply) => {
      const existing = await findChargePoint(request.params.id)
      if (!existing) return reply.status(404).send({ message: 'Charge point not found' })
      if (existing.source === 'ocm') {
        return reply.status(409).send({ message: PUBLIC_POINT_MESSAGE })
      }

      await db.delete(chargePoint).where(eq(chargePoint.id, request.params.id))
      return reply.status(204).send(null)
    },
  )
}
