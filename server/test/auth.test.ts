import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.ts'
import { db } from '../src/db/client.ts'
import { user } from '../src/db/schema/index.ts'
import { makeDriver, resetDatabase, signUp, toCookieHeader } from './helpers.ts'

const app = buildApp()

beforeAll(async () => {
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(async () => {
  await resetDatabase()
})

describe('health', () => {
  it('responds ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })
})

describe('sign up (RF02)', () => {
  it('creates a driver and starts a session', async () => {
    const { response, body, cookie } = await signUp(app)

    expect(response.statusCode).toBe(200)
    expect(cookie).toContain('better-auth.session_token=')

    const [created] = await db.select().from(user).where(eq(user.email, body.email))
    expect(created?.role).toBe('driver')
  })

  it('never creates an admin from the sign-up body', async () => {
    const body = { ...makeDriver(), role: 'admin' }

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: body,
    })

    // Better Auth rejects fields marked `input: false` instead of ignoring them.
    expect(response.statusCode).toBe(400)
    const admins = await db.select().from(user).where(eq(user.role, 'admin'))
    expect(admins).toHaveLength(0)
  })

  it('rejects a duplicated e-mail', async () => {
    const body = makeDriver()
    await signUp(app, body)

    const { response } = await signUp(app, body)

    expect(response.statusCode).toBe(422)
  })

  it('rejects a short password', async () => {
    const { response } = await signUp(app, makeDriver({ password: '123' }))

    expect(response.statusCode).toBe(400)
  })
})

describe('sign in (RF01)', () => {
  it('logs in with e-mail and password', async () => {
    const { body } = await signUp(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: body.email, password: body.password },
    })

    expect(response.statusCode).toBe(200)
    expect(toCookieHeader(response.headers['set-cookie'])).toContain(
      'better-auth.session_token=',
    )
  })

  it('rejects a wrong password', async () => {
    const { body } = await signUp(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: body.email, password: 'senha-errada-000' },
    })

    expect(response.statusCode).toBe(401)
  })
})

describe('profile (RF03, RF04)', () => {
  it('returns the logged user on GET /me', async () => {
    const { body, cookie } = await signUp(app)

    const response = await app.inject({ method: 'GET', url: '/me', headers: { cookie } })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      name: body.name,
      email: body.email,
      role: 'driver',
    })
  })

  it('returns 401 on GET /me without a session', async () => {
    const response = await app.inject({ method: 'GET', url: '/me' })

    expect(response.statusCode).toBe(401)
  })

  it('updates the name', async () => {
    const { cookie } = await signUp(app)

    const update = await app.inject({
      method: 'POST',
      url: '/api/auth/update-user',
      headers: { cookie },
      payload: { name: 'Maria Atualizada' },
    })
    expect(update.statusCode).toBe(200)

    const me = await app.inject({ method: 'GET', url: '/me', headers: { cookie } })
    expect(me.json().name).toBe('Maria Atualizada')
  })

  it('changes the password', async () => {
    const { body, cookie } = await signUp(app)

    const change = await app.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      headers: { cookie },
      payload: { currentPassword: body.password, newPassword: 'nova-senha-456' },
    })
    expect(change.statusCode).toBe(200)

    const signIn = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: body.email, password: 'nova-senha-456' },
    })
    expect(signIn.statusCode).toBe(200)
  })
})
