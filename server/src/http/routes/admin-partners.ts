import { asc, eq, sql } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db } from '../../db/client.ts'
import { partner } from '../../db/schema/index.ts'
import { isValidCnpj, normalizeCnpj } from '../../lib/cnpj.ts'

const messageSchema = z.object({ message: z.string() })

const partnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  document: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.date(),
  chargePointCount: z.number().int(),
})

const partnerBody = z.object({
  name: z.string().trim().min(2).max(120),
  document: z
    .string()
    .trim()
    .refine(isValidCnpj, 'CNPJ inválido')
    .transform(normalizeCnpj)
    .nullable()
    .optional(),
  email: z.email().nullable().optional(),
  phone: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .pipe(z.string().min(10, 'Telefone com DDD').max(13))
    .nullable()
    .optional(),
  active: z.boolean().optional(),
})

const partnerColumns = {
  id: partner.id,
  name: partner.name,
  document: partner.document,
  email: partner.email,
  phone: partner.phone,
  active: partner.active,
  createdAt: partner.createdAt,
  // Fully qualified: inside a subquery Drizzle renders bare column names.
  chargePointCount: sql<number>`(select count(*)::int from "charge_point" where "charge_point"."partner_id" = "partner"."id")`,
}

async function findPartner(id: string) {
  const [row] = await db.select(partnerColumns).from(partner).where(eq(partner.id, id))
  return row
}

/** Registered under /admin, behind the admin role check (RF13). */
export const adminPartnerRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/partners',
    {
      schema: {
        tags: ['admin'],
        operationId: 'adminListPartners',
        summary: 'Lista os parceiros com a quantidade de pontos',
        response: { 200: z.object({ partners: z.array(partnerSchema) }) },
      },
    },
    async () => ({
      partners: await db.select(partnerColumns).from(partner).orderBy(asc(partner.name)),
    }),
  )

  app.post(
    '/partners',
    {
      schema: {
        tags: ['admin'],
        operationId: 'adminCreatePartner',
        summary: 'Cria um parceiro',
        body: partnerBody,
        response: { 201: partnerSchema },
      },
    },
    async (request, reply) => {
      const [created] = await db
        .insert(partner)
        .values(request.body)
        .returning({ id: partner.id })
      const row = created && (await findPartner(created.id))
      if (!row) throw new Error('Partner not found after insert')
      return reply.status(201).send(row)
    },
  )

  app.get(
    '/partners/:id',
    {
      schema: {
        tags: ['admin'],
        operationId: 'adminGetPartner',
        summary: 'Detalhe de um parceiro',
        params: z.object({ id: z.string() }),
        response: { 200: partnerSchema, 404: messageSchema },
      },
    },
    async (request, reply) => {
      const row = await findPartner(request.params.id)
      if (!row) return reply.status(404).send({ message: 'Partner not found' })
      return row
    },
  )

  app.patch(
    '/partners/:id',
    {
      schema: {
        tags: ['admin'],
        operationId: 'adminUpdatePartner',
        summary: 'Edita um parceiro (inclui ativar/desativar)',
        params: z.object({ id: z.string() }),
        body: partnerBody.partial(),
        response: { 200: partnerSchema, 404: messageSchema },
      },
    },
    async (request, reply) => {
      if (Object.keys(request.body).length === 0) {
        const current = await findPartner(request.params.id)
        if (!current) return reply.status(404).send({ message: 'Partner not found' })
        return current
      }

      const updated = await db
        .update(partner)
        .set(request.body)
        .where(eq(partner.id, request.params.id))
        .returning({ id: partner.id })

      const row = updated[0] && (await findPartner(updated[0].id))
      if (!row) return reply.status(404).send({ message: 'Partner not found' })
      return row
    },
  )

  app.delete(
    '/partners/:id',
    {
      schema: {
        tags: ['admin'],
        operationId: 'adminDeletePartner',
        summary: 'Exclui um parceiro e seus pontos (o histórico de recargas é mantido)',
        params: z.object({ id: z.string() }),
        response: { 204: z.null(), 404: messageSchema },
      },
    },
    async (request, reply) => {
      const deleted = await db
        .delete(partner)
        .where(eq(partner.id, request.params.id))
        .returning({ id: partner.id })

      if (deleted.length === 0)
        return reply.status(404).send({ message: 'Partner not found' })
      return reply.status(204).send(null)
    },
  )
}
