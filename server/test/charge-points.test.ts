import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.ts'
import { db } from '../src/db/client.ts'
import { chargePoint, partner } from '../src/db/schema/index.ts'
import { resetDatabase, signUp } from './helpers.ts'

const app = buildApp()
let cookie: string

// Betim city center; the other points are at known distances from it.
const origin = { lat: -19.9678, lng: -44.1983 }

beforeAll(async () => {
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(async () => {
  await resetDatabase()
  cookie = (await signUp(app)).cookie

  await db.insert(partner).values([
    { id: 'p-active', name: 'Posto Ativo' },
    { id: 'p-inactive', name: 'Posto Inativo', active: false },
  ])

  await db.insert(chargePoint).values([
    {
      id: 'near',
      source: 'partner',
      partnerId: 'p-active',
      name: 'Perto',
      location: { latitude: -19.9687, longitude: -44.1979 }, // ~100 m
      powerKw: 22,
      pricePerKwhCents: 180,
      connectors: ['Tipo 2'],
    },
    {
      id: 'public',
      source: 'ocm',
      externalId: '123',
      name: 'Público',
      location: { latitude: -19.9545, longitude: -44.1843 }, // ~2 km
      attribution: 'Dados: Open Charge Map (CC BY 4.0)',
    },
    {
      id: 'far',
      source: 'partner',
      partnerId: 'p-active',
      name: 'Belo Horizonte',
      location: { latitude: -19.9167, longitude: -43.9345 }, // ~28 km
    },
    {
      id: 'inactive-point',
      source: 'partner',
      partnerId: 'p-active',
      name: 'Desativado',
      active: false,
      location: { latitude: -19.968, longitude: -44.198 },
    },
    {
      id: 'inactive-partner',
      source: 'partner',
      partnerId: 'p-inactive',
      name: 'Parceiro inativo',
      location: { latitude: -19.968, longitude: -44.198 },
    },
  ])
})

function nearby(query: Record<string, number | string>) {
  return app.inject({
    method: 'GET',
    url: '/charge-points/nearby',
    query: Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)])),
    headers: { cookie },
  })
}

describe('GET /charge-points/nearby (RF08)', () => {
  it('lists listed points within the radius, nearest first', async () => {
    const response = await nearby({ ...origin, radiusKm: 10 })

    expect(response.statusCode).toBe(200)
    const { chargePoints } = response.json()
    expect(chargePoints.map((p: { id: string }) => p.id)).toEqual(['near', 'public'])

    const [near, pub] = chargePoints
    expect(near).toMatchObject({
      source: 'partner',
      partnerName: 'Posto Ativo',
      powerKw: 22,
      pricePerKwhCents: 180,
      connectors: ['Tipo 2'],
      latitude: -19.9687,
      longitude: -44.1979,
    })
    expect(near.distanceMeters).toBeGreaterThan(50)
    expect(near.distanceMeters).toBeLessThan(150)
    expect(pub).toMatchObject({ source: 'ocm', partnerName: null })
    expect(pub.distanceMeters).toBeGreaterThan(1500)
    expect(pub.distanceMeters).toBeLessThan(2500)
  })

  it('includes farther points when the radius grows', async () => {
    const response = await nearby({ ...origin, radiusKm: 50 })

    expect(response.json().chargePoints.map((p: { id: string }) => p.id)).toEqual([
      'near',
      'public',
      'far',
    ])
  })

  it('uses a 10 km radius by default', async () => {
    const response = await nearby(origin)

    expect(response.json().chargePoints).toHaveLength(2)
  })

  it('rejects invalid coordinates and radius', async () => {
    expect((await nearby({ lat: 91, lng: 0 })).statusCode).toBe(400)
    expect((await nearby({ ...origin, radiusKm: 51 })).statusCode).toBe(400)
    expect((await nearby({ lat: 'abc', lng: 0 })).statusCode).toBe(400)
  })

  it('requires a session', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/charge-points/nearby',
      query: { lat: String(origin.lat), lng: String(origin.lng) },
    })

    expect(response.statusCode).toBe(401)
  })
})

describe('GET /charge-points/:id', () => {
  it('returns a listed point', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/charge-points/public',
      headers: { cookie },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      id: 'public',
      name: 'Público',
      attribution: 'Dados: Open Charge Map (CC BY 4.0)',
    })
  })

  it.each(['inactive-point', 'inactive-partner', 'missing'])(
    'returns 404 for %s',
    async (id) => {
      const response = await app.inject({
        method: 'GET',
        url: `/charge-points/${id}`,
        headers: { cookie },
      })

      expect(response.statusCode).toBe(404)
    },
  )
})

describe('charge_point constraints', () => {
  it('rejects a partner point without partner', async () => {
    await expect(
      db.insert(chargePoint).values({
        source: 'partner',
        name: 'Sem parceiro',
        location: { latitude: 0, longitude: 0 },
      }),
    ).rejects.toThrow()
  })

  it('stores the location with SRID 4326', async () => {
    const [row] = await db.select().from(chargePoint).where(eq(chargePoint.id, 'near'))

    expect(row?.location).toEqual({ latitude: -19.9687, longitude: -44.1979 })
  })
})
