import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { buildApp } from '../src/app.ts'
import { db } from '../src/db/client.ts'
import { chargePoint, partner } from '../src/db/schema/index.ts'
import { resetDatabase, signUp } from './helpers.ts'

const app = buildApp()
let cookie: string

// Straight route ~10.3 km east of Betim's center, along latitude -19.9678.
const FROM = { latitude: -19.9678, longitude: -44.1983 }
const TO = { latitude: -19.9678, longitude: -44.1 }
const ROUTE_DISTANCE = 10_300

const query = {
  fromLat: String(FROM.latitude),
  fromLng: String(FROM.longitude),
  toLat: String(TO.latitude),
  toLng: String(TO.longitude),
}

beforeAll(async () => {
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(async () => {
  await resetDatabase()
  cookie = (await signUp(app)).cookie

  await db.insert(partner).values({ id: 'p', name: 'Parceiro' })

  // Inserted out of driving order on purpose.
  await db.insert(chargePoint).values([
    {
      id: 'late',
      source: 'ocm',
      externalId: '1',
      name: 'Perto do fim',
      location: { latitude: -19.975, longitude: -44.12 }, // ~0.8 km off, km ~8
    },
    {
      id: 'early',
      source: 'partner',
      partnerId: 'p',
      name: 'Perto do início',
      location: { latitude: -19.9688, longitude: -44.18 }, // ~0.1 km off, km ~1.9
    },
    {
      id: 'off-route',
      source: 'partner',
      partnerId: 'p',
      name: 'Longe da rota',
      location: { latitude: -19.9918, longitude: -44.15 }, // ~2.7 km off
    },
    {
      id: 'inactive',
      source: 'partner',
      partnerId: 'p',
      name: 'Desativado',
      active: false,
      location: { latitude: -19.9678, longitude: -44.15 }, // on the route
    },
  ])

  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        code: 'Ok',
        routes: [
          {
            distance: ROUTE_DISTANCE,
            duration: 900,
            geometry: {
              coordinates: [
                [FROM.longitude, FROM.latitude],
                [-44.15, -19.9678],
                [TO.longitude, TO.latitude],
              ],
            },
          },
        ],
      }),
    ),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

function getTrip(params: Record<string, string> = query) {
  return app.inject({ method: 'GET', url: '/trips', query: params, headers: { cookie } })
}

describe('GET /trips (RF05, RF07)', () => {
  it('returns the route and the listed points along it, in driving order', async () => {
    const response = await getTrip()

    expect(response.statusCode).toBe(200)
    const { route, chargePoints } = response.json()

    expect(route).toMatchObject({ distanceMeters: ROUTE_DISTANCE, durationSeconds: 900 })
    expect(route.coordinates).toHaveLength(3)

    expect(chargePoints.map((p: { id: string }) => p.id)).toEqual(['early', 'late'])

    const [early, late] = chargePoints
    expect(early.partnerName).toBe('Parceiro')
    expect(early.distanceFromRouteMeters).toBeLessThan(200)
    expect(early.distanceAlongRouteMeters).toBeGreaterThan(1500)
    expect(early.distanceAlongRouteMeters).toBeLessThan(2500)

    expect(late.source).toBe('ocm')
    expect(late.distanceFromRouteMeters).toBeGreaterThan(600)
    expect(late.distanceFromRouteMeters).toBeLessThan(1000)
    expect(late.distanceAlongRouteMeters).toBeGreaterThan(7500)
    expect(late.distanceAlongRouteMeters).toBeLessThan(8800)
  })

  it('widens the corridor with corridorKm', async () => {
    const response = await getTrip({ ...query, corridorKm: '3' })

    expect(response.json().chargePoints.map((p: { id: string }) => p.id)).toEqual([
      'early',
      'off-route',
      'late',
    ])
  })

  it('rejects a corridor wider than 10 km', async () => {
    expect((await getTrip({ ...query, corridorKm: '11' })).statusCode).toBe(400)
  })

  it('returns 404 when there is no route', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'NoRoute', routes: [] })),
    )

    expect((await getTrip()).statusCode).toBe(404)
  })

  it('returns 502 when Mapbox fails', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new TypeError('fetch failed'))

    expect((await getTrip()).statusCode).toBe(502)
  })

  it('requires a session', async () => {
    const response = await app.inject({ method: 'GET', url: '/trips', query })

    expect(response.statusCode).toBe(401)
  })
})
