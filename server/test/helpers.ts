import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import type { App } from '../src/app.ts'
import { db } from '../src/db/client.ts'

export async function resetDatabase() {
  await db.execute(
    sql`truncate table "user", "session", "account", "verification" cascade`,
  )
}

export function makeDriver(
  overrides: Partial<{ name: string; email: string; password: string }> = {},
) {
  return {
    name: 'Maria Motorista',
    email: `maria-${randomUUID()}@example.com`,
    password: 'senha-segura-123',
    ...overrides,
  }
}

/** Signs up a driver and returns the session cookie to send on later requests. */
export async function signUp(app: App, body = makeDriver()) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-up/email',
    payload: body,
  })

  return { response, body, cookie: toCookieHeader(response.headers['set-cookie']) }
}

export function toCookieHeader(setCookie: string | string[] | undefined) {
  const values = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
  return values.map((value) => value.split(';')[0]).join('; ')
}
