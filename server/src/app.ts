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
import { authRoutes } from './http/routes/auth.ts'
import { healthRoutes } from './http/routes/health.ts'
import { meRoutes } from './http/routes/me.ts'

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

  return app
}

export type App = ReturnType<typeof buildApp>
