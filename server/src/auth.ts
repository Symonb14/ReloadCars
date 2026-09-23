import { expo } from '@better-auth/expo'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, openAPI } from 'better-auth/plugins'
import { db } from './db/client.ts'
import { env } from './env.ts'

export const roles = ['driver', 'admin'] as const
export type Role = (typeof roles)[number]

const isDevelopment = env.NODE_ENV === 'development'

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  trustedOrigins: [
    env.WEB_ORIGIN,
    env.MOBILE_SCHEME,
    // Expo Go serves the app from exp://<local-ip>:<port> during development.
    ...(isDevelopment ? ['exp://', 'exp://**'] : []),
  ],
  plugins: [
    admin({ defaultRole: 'driver', adminRoles: ['admin'] }),
    expo(),
    // Auth endpoints reference at /api/auth/reference (not exposed in production).
    ...(env.NODE_ENV === 'production' ? [] : [openAPI()]),
  ],
})

export type Session = typeof auth.$Infer.Session
