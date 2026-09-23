import { fromNodeHeaders } from 'better-auth/node'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { auth, type Role, type Session } from '../auth.ts'

declare module 'fastify' {
  interface FastifyRequest {
    session: Session | null
  }
}

/**
 * preHandler that requires a valid session (401) and, optionally, a role (403).
 * On success the session is available as `request.session`.
 */
export function requireAuth(options: { role?: Role } = {}) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    })

    if (!session) {
      return reply.status(401).send({ message: 'Unauthorized' })
    }

    if (options.role && session.user.role !== options.role) {
      return reply.status(403).send({ message: 'Forbidden' })
    }

    request.session = session
  }
}

/** Returns the session guaranteed by `requireAuth`. */
export function getSession(request: FastifyRequest): Session {
  if (!request.session) {
    throw new Error('getSession() called on a route without requireAuth()')
  }
  return request.session
}
