import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.ts'
import { db } from '../src/db/client.ts'
import { chargePoint, reload, user } from '../src/db/schema/index.ts'
import { resetDatabase, signUp, signUpAdmin } from './helpers.ts'

const app = buildApp()
let admin: string
let driver: string

const location = { latitude: -19.9678, longitude: -44.1983 }

beforeAll(async () => {
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(async () => {
  await resetDatabase()
  admin = (await signUpAdmin(app)).cookie
  driver = (await signUp(app)).cookie
})

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

function call(method: Method, url: string, payload?: unknown, cookie = admin) {
  return app.inject({ method, url, payload: payload as object, headers: { cookie } })
}

const validPoint = {
  name: 'Posto Novo',
  address: 'Rua X, 10, Betim',
  latitude: -19.95,
  longitude: -44.2,
  powerKw: 22,
  pricePerKwhCents: 190,
  connectors: ['Tipo 2 (cabo)', 'CCS2'],
  openingHours: '24 horas',
}

async function createPartner(body: Record<string, unknown> = { name: 'Parceiro' }) {
  const response = await call('POST', '/admin/partners', body)
  expect(response.statusCode).toBe(201)
  return response.json() as { id: string }
}

describe('access control', () => {
  it.each([
    ['GET', '/admin/partners'],
    ['POST', '/admin/partners'],
    ['GET', '/admin/charge-points'],
    ['DELETE', '/admin/charge-points/any'],
  ] as const)('%s %s: 401 without session, 403 for drivers', async (method, url) => {
    const anonymous = await app.inject({ method, url, payload: {} })
    expect(anonymous.statusCode).toBe(401)

    const asDriver = await call(method, url, {}, driver)
    expect(asDriver.statusCode).toBe(403)
  })
})

describe('partners (RF13)', () => {
  it('creates with a valid CNPJ (numeric or alphanumeric) and normalizes it', async () => {
    const numeric = await call('POST', '/admin/partners', {
      name: 'Posto Numérico',
      document: '11.222.333/0001-81',
      email: 'contato@posto.com',
      phone: '(31) 99999-0000',
    })
    expect(numeric.statusCode).toBe(201)
    expect(numeric.json()).toMatchObject({
      name: 'Posto Numérico',
      document: '11222333000181',
      phone: '31999990000',
      active: true,
      chargePointCount: 0,
    })

    const alphanumeric = await call('POST', '/admin/partners', {
      name: 'Posto Alfanumérico',
      document: '12.abc.345/01de-35',
    })
    expect(alphanumeric.json().document).toBe('12ABC34501DE35')
  })

  it('rejects an invalid CNPJ, short phone or missing name', async () => {
    for (const body of [
      { name: 'X Posto', document: '11.222.333/0001-82' },
      { name: 'X Posto', phone: '9999' },
      { document: '11.222.333/0001-81' },
    ]) {
      expect((await call('POST', '/admin/partners', body)).statusCode).toBe(400)
    }
  })

  it('lists partners with the number of points', async () => {
    const { id } = await createPartner({ name: 'Com pontos' })
    await createPartner({ name: 'Sem pontos' })
    await call('POST', '/admin/charge-points', { ...validPoint, partnerId: id })

    const { partners } = (await call('GET', '/admin/partners')).json()

    expect(
      partners.map((p: { name: string; chargePointCount: number }) => [
        p.name,
        p.chargePointCount,
      ]),
    ).toEqual([
      ['Com pontos', 1],
      ['Sem pontos', 0],
    ])
  })

  it('updates and deactivates a partner, hiding its points from the app', async () => {
    const { id } = await createPartner()
    await call('POST', '/admin/charge-points', { ...validPoint, partnerId: id })

    const updated = await call('PATCH', `/admin/partners/${id}`, {
      name: 'Renomeado',
      active: false,
    })
    expect(updated.json()).toMatchObject({ name: 'Renomeado', active: false })

    const nearby = await app.inject({
      method: 'GET',
      url: '/charge-points/nearby',
      query: { lat: '-19.95', lng: '-44.2' },
      headers: { cookie: driver },
    })
    expect(nearby.json().chargePoints).toEqual([])
  })

  it('accepts an empty PATCH', async () => {
    const { id } = await createPartner()

    expect((await call('PATCH', `/admin/partners/${id}`, {})).statusCode).toBe(200)
  })

  it('deletes a partner with its points, keeping the reload history', async () => {
    const { id } = await createPartner({ name: 'Posto Antigo' })
    const point = (
      await call('POST', '/admin/charge-points', { ...validPoint, partnerId: id })
    ).json()
    await app.inject({
      method: 'POST',
      url: '/reloads',
      payload: { chargePointId: point.id, durationMinutes: 60 },
      headers: { cookie: driver },
    })

    expect((await call('DELETE', `/admin/partners/${id}`)).statusCode).toBe(204)

    expect(await db.select().from(chargePoint)).toEqual([])
    const [history] = await db.select().from(reload)
    expect(history).toMatchObject({ chargePointId: null, chargePointName: 'Posto Novo' })
    expect((await call('GET', `/admin/partners/${id}`)).statusCode).toBe(404)
  })
})

describe('charge points (RF14)', () => {
  it('creates a partner point that the app shows', async () => {
    const { id: partnerId } = await createPartner({ name: 'Posto Parceiro' })

    const response = await call('POST', '/admin/charge-points', {
      ...validPoint,
      partnerId,
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      source: 'partner',
      partnerId,
      partnerName: 'Posto Parceiro',
      latitude: -19.95,
      longitude: -44.2,
      connectors: ['Tipo 2 (cabo)', 'CCS2'],
      active: true,
    })

    const nearby = await app.inject({
      method: 'GET',
      url: '/charge-points/nearby',
      query: { lat: '-19.95', lng: '-44.2' },
      headers: { cookie: driver },
    })
    expect(nearby.json().chargePoints).toHaveLength(1)
  })

  it('validates partner, connectors and coordinates', async () => {
    const { id: partnerId } = await createPartner()

    const unknownPartner = await call('POST', '/admin/charge-points', {
      ...validPoint,
      partnerId: 'missing',
    })
    expect(unknownPartner.statusCode).toBe(400)

    for (const body of [
      { ...validPoint, partnerId, connectors: ['USB'] },
      { ...validPoint, partnerId, latitude: 95 },
      { ...validPoint, partnerId, pricePerKwhCents: -1 },
    ]) {
      expect((await call('POST', '/admin/charge-points', body)).statusCode).toBe(400)
    }
  })

  it('moves a point and requires latitude and longitude together', async () => {
    const { id: partnerId } = await createPartner()
    const { id } = (
      await call('POST', '/admin/charge-points', { ...validPoint, partnerId })
    ).json()

    const moved = await call('PATCH', `/admin/charge-points/${id}`, {
      latitude: -19.96,
      longitude: -44.21,
      pricePerKwhCents: null,
    })
    expect(moved.json()).toMatchObject({
      latitude: -19.96,
      longitude: -44.21,
      pricePerKwhCents: null,
    })

    const halfMove = await call('PATCH', `/admin/charge-points/${id}`, {
      latitude: -19.9,
    })
    expect(halfMove.statusCode).toBe(400)
  })

  it('lists all points with filters, including inactive ones', async () => {
    const { id: partnerId } = await createPartner()
    await call('POST', '/admin/charge-points', {
      ...validPoint,
      partnerId,
      active: false,
    })
    await db.insert(chargePoint).values({
      source: 'ocm',
      externalId: '1',
      name: 'Público Shopping',
      location,
    })

    const all = (await call('GET', '/admin/charge-points')).json().chargePoints
    // Partner points first, even though "ocm" sorts before "partner".
    expect(all.map((p: { source: string }) => p.source)).toEqual(['partner', 'ocm'])

    const publicOnly = (await call('GET', '/admin/charge-points?source=ocm')).json()
    expect(publicOnly.chargePoints.map((p: { name: string }) => p.name)).toEqual([
      'Público Shopping',
    ])

    const search = (await call('GET', '/admin/charge-points?q=novo')).json()
    expect(search.chargePoints).toMatchObject([{ name: 'Posto Novo', active: false }])
  })

  it('protects public points from edits and deletion', async () => {
    const [publicPoint] = await db
      .insert(chargePoint)
      .values({ source: 'ocm', externalId: '1', name: 'Público', location })
      .returning({ id: chargePoint.id })

    const patch = await call('PATCH', `/admin/charge-points/${publicPoint?.id}`, {
      name: 'Hack',
    })
    expect(patch.statusCode).toBe(409)

    const remove = await call('DELETE', `/admin/charge-points/${publicPoint?.id}`)
    expect(remove.statusCode).toBe(409)
  })

  it('deletes a partner point', async () => {
    const { id: partnerId } = await createPartner()
    const { id } = (
      await call('POST', '/admin/charge-points', { ...validPoint, partnerId })
    ).json()

    expect((await call('DELETE', `/admin/charge-points/${id}`)).statusCode).toBe(204)
    expect((await call('GET', `/admin/charge-points/${id}`)).statusCode).toBe(404)
  })
})

describe('overview', () => {
  it('counts partners, points, drivers and this month reloads', async () => {
    const { id: partnerId } = await createPartner({ name: 'Ativo' })
    const inactive = await createPartner({ name: 'Inativo' })
    await call('PATCH', `/admin/partners/${inactive.id}`, { active: false })
    const point = (
      await call('POST', '/admin/charge-points', { ...validPoint, partnerId })
    ).json()
    await call('POST', '/admin/charge-points', {
      ...validPoint,
      partnerId,
      active: false,
    })
    await db
      .insert(chargePoint)
      .values({ source: 'ocm', externalId: '1', name: 'Público', location })
    await app.inject({
      method: 'POST',
      url: '/reloads',
      payload: { chargePointId: point.id, durationMinutes: 60 },
      headers: { cookie: driver },
    })

    const response = await call('GET', '/admin/overview')

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      partners: { total: 2, active: 1 },
      chargePoints: { partner: 2, public: 1, active: 2, inactive: 1 },
      drivers: 1,
      reloadsThisMonth: { count: 1, energyKwh: 22, totalCents: 4180 },
    })
  })

  it('is admin only', async () => {
    expect((await call('GET', '/admin/overview', undefined, driver)).statusCode).toBe(403)
  })
})

describe('admin account', () => {
  it('is only created by promotion, never by sign-up', async () => {
    const admins = await db.select().from(user).where(eq(user.role, 'admin'))

    expect(admins).toHaveLength(1)
  })
})
