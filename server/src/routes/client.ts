import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

export async function clientRoutes(app: FastifyInstance) {
  app.post('/client', async (request) => {
    const bodySchema = z.object({
      name: z.string(),
      login: z.string(),
      email: z.string(),
      latitude: z.string(),
      longitude: z.string(),
      address: z.string(),
    })
    const { name, login, email, latitude, longitude, address } =
      bodySchema.parse(request.body)
    const memory = await prisma.client.create({
      data: {
        name,
        login,
        email,
        latitude,
        longitude,
        address,
      },
    })
    return memory
  })
}
