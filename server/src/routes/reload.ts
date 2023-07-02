import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

export async function reloadsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request) => {
    await request.jwtVerify()
  })

  app.get('/reloads', async (request) => {
    const reloads = await prisma.reload.findMany({
      where: {
        userId: request.user.sub,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return reloads.map((reload) => {
      return {
        id: reload.id,
        kwh: reload.kwh,
        time: reload.time,
        value: reload.value,
        createdAt: reload.createdAt,
      }
    })
  })

  // app.get('/memories/:id', async (request, reply) => {
  //   const paramsSchema = z.object({
  //     id: z.string().uuid(),
  //   })

  //   const { id } = paramsSchema.parse(request.params)

  //   const reload = await prisma.reload.findUniqueOrThrow({
  //     where: {
  //       id,
  //     },
  //   })

  //   if (!reload.kwh && reload.userId !== request.user.sub) {
  //     return reply.status(401).send()
  //   }

  //   return reload
  // })

  // app.post('/memories', async (request) => {
  //   const bodySchema = z.object({
  //     content: z.string(),
  //     coverUrl: z.string(),
  //     isPublic: z.coerce.boolean().default(false),
  //   })

  //   const { content, coverUrl, isPublic } = bodySchema.parse(request.body)

  //   const memory = await prisma.reload.create({
  //     data: {
  //       content,
  //       coverUrl,
  //       isPublic,
  //       userId: request.user.sub,
  //     },
  //   })

  //   return memory
  // })

  // app.put('/memories/:id', async (request, reply) => {
  //   const bodySchema = z.object({
  //     content: z.string(),
  //     coverUrl: z.string(),
  //     isPublic: z.coerce.boolean().default(false),
  //   })

  //   const paramsSchema = z.object({
  //     id: z.string().uuid(),
  //   })

  //   const { id } = paramsSchema.parse(request.params)

  //   const { content, coverUrl, isPublic } = bodySchema.parse(request.body)

  //   let memory = await prisma.reload.findUniqueOrThrow({
  //     where: {
  //       id,
  //     },
  //   })

  //   if (memory.userId !== request.user.sub) {
  //     return reply.status(401).send()
  //   }

  //   memory = await prisma.memory.update({
  //     where: {
  //       id,
  //     },
  //     data: {
  //       content,
  //       coverUrl,
  //       isPublic,
  //     },
  //   })

  //   return memory
  // })

  // app.delete('/memories/:id', async (request, reply) => {
  //   const paramsSchema = z.object({
  //     id: z.string().uuid(),
  //   })

  //   const { id } = paramsSchema.parse(request.params)

  //   const memory = await prisma.memory.findUniqueOrThrow({
  //     where: {
  //       id,
  //     },
  //   })

  //   if (memory.userId !== request.user.sub) {
  //     return reply.status(401).send()
  //   }

  //   await prisma.memory.delete({
  //     where: {
  //       id,
  //     },
  //   })
  // })

  app.post('/reload', async (request) => {
    const bodySchema = z.object({
      time: z.string(),
    })

    const { time } = bodySchema.parse(request.body)

    const kwh = (parseFloat(time) * 10).toString()
    const value = kwh

    const memory = await prisma.reload.create({
      data: {
        time,
        value,
        kwh,
        userId: request.user.sub,
      },
    })

    return memory
  })

  // app.post('/client', async (request) => {
  //   const bodySchema = z.object({
  //     name: z.string(),
  //     login: z.string(),
  //     email: z.string(),
  //     latitude: z.string(),
  //     longitude: z.string(),
  //     address: z.string(),
  //   })

  //   const { name, login, email, latitude, longitude, address } =
  //     bodySchema.parse(request.body)

  //   const memory = await prisma.client.create({
  //     data: {
  //       name,
  //       login,
  //       email,
  //       latitude,
  //       longitude,
  //       address,
  //     },
  //   })

  //   return memory
  // })
}
