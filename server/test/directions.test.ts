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
import { resetDatabase, signUp } from './helpers.ts'

const app = buildApp()
let cookie: string

const query = {
  fromLat: '-19.9678',
  fromLng: '-44.1983',
  toLat: '-19.9530',
  toLng: '-44.2120',
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
})

afterEach(() => {
  vi.restoreAllMocks()
})

function mockMapbox(body: unknown, status = 200) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))
}

function getDirections(params: Record<string, string> = query) {
  return app.inject({
    method: 'GET',
    url: '/directions',
    query: params,
    headers: { cookie },
  })
}

describe('GET /directions (RF09)', () => {
  it('returns distance, duration and the route line', async () => {
    const fetchSpy = mockMapbox({
      code: 'Ok',
      routes: [
        {
          distance: 7011.4,
          duration: 905.6,
          geometry: {
            coordinates: [
              [-44.1983, -19.9678],
              [-44.205, -19.96],
              [-44.212, -19.953],
            ],
          },
        },
      ],
    })

    const response = await getDirections()

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      distanceMeters: 7011,
      durationSeconds: 906,
      coordinates: [
        { latitude: -19.9678, longitude: -44.1983 },
        { latitude: -19.96, longitude: -44.205 },
        { latitude: -19.953, longitude: -44.212 },
      ],
    })

    const calledUrl = String(fetchSpy.mock.calls[0]?.[0])
    expect(calledUrl).toContain(
      '/directions/v5/mapbox/driving/-44.1983,-19.9678;-44.212,-19.953',
    )
    expect(calledUrl).toContain('access_token=test-token')
  })

  it('returns 404 when there is no route', async () => {
    mockMapbox({ code: 'NoRoute', routes: [] }, 200)

    expect((await getDirections()).statusCode).toBe(404)
  })

  it('returns 502 when Mapbox fails', async () => {
    mockMapbox({ message: 'Not Authorized - Invalid Token' }, 401)

    const response = await getDirections()

    expect(response.statusCode).toBe(502)
    expect(response.body).not.toContain('test-token')
  })

  it('returns 502 when Mapbox is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('fetch failed'))

    expect((await getDirections()).statusCode).toBe(502)
  })

  it('validates coordinates', async () => {
    expect((await getDirections({ ...query, toLat: '100' })).statusCode).toBe(400)
  })

  it('requires a session', async () => {
    const response = await app.inject({ method: 'GET', url: '/directions', query })

    expect(response.statusCode).toBe(401)
  })
})
