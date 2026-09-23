import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  WEB_ORIGIN: z.url(),
  MOBILE_SCHEME: z
    .string()
    .regex(/^[a-z][a-z0-9+.-]*:\/\/$/, 'expected e.g. reloadcars://'),
})

export const env = envSchema.parse(process.env)
