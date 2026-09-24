import fastifyCors from '@fastify/cors'
import fastifySwagger from '@fastify/swagger'
import scalarApiReference from '@scalar/fastify-api-reference'
import fastify, { type FastifyError } from 'fastify'
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { env } from './env.ts'
import { requireAuth } from './http/require-auth.ts'
import { adminChargePointRoutes } from './http/routes/admin-charge-points.ts'
import { adminOverviewRoutes } from './http/routes/admin-overview.ts'
import { adminPartnerRoutes } from './http/routes/admin-partners.ts'
import { authRoutes } from './http/routes/auth.ts'
import { chargePointRoutes } from './http/routes/charge-points.ts'
import { directionsRoutes } from './http/routes/directions.ts'
import { healthRoutes } from './http/routes/health.ts'
import { meRoutes } from './http/routes/me.ts'
import { placesRoutes } from './http/routes/places.ts'
import { reloadRoutes } from './http/routes/reloads.ts'
import { tripsRoutes } from './http/routes/trips.ts'

export function buildApp() {
  const app = fastify({
    logger: env.NODE_ENV === 'development' && {
      transport: { target: 'pino-pretty' },
    },
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.register(fastifyCors, {
    origin: [env.WEB_ORIGIN],
    credentials: true,
  })

  app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'ReloadCars API',
        description: 'API do app de pontos de recarga para veículos elétricos.',
        version: '1.0.0',
      },
    },
    transform: jsonSchemaTransform,
  })

  app.register(scalarApiReference, { routePrefix: '/docs' })

  app.setErrorHandler<FastifyError>((error, _request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        message: 'Validation error',
        issues: error.validation,
      })
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ message: error.message })
    }

    app.log.error(error)
    return reply.status(500).send({ message: 'Internal server error' })
  })

  // Filled by requireAuth(); declared here so every route plugin shares it.
  app.decorateRequest('session', null)

  app.register(healthRoutes)
  app.register(authRoutes)
  app.register(meRoutes)
  app.register(chargePointRoutes)
  app.register(directionsRoutes)
  app.register(placesRoutes)
  app.register(tripsRoutes)
  app.register(reloadRoutes)

  // Admin panel (RF13, RF14): every route under /admin requires the admin role.
  app.register(
    async (admin) => {
      admin.addHook('onRequest', requireAuth({ role: 'admin' }))
      admin.register(adminOverviewRoutes)
      admin.register(adminPartnerRoutes)
      admin.register(adminChargePointRoutes)
    },
    { prefix: '/admin' },
  )

  return app
}

export type App = ReturnType<typeof buildApp>
