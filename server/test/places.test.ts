import { randomUUID } from 'node:crypto'
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
const sessionToken = randomUUID()

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

function get(url: string, query: Record<string, string>) {
  return app.inject({ method: 'GET', url, query, headers: { cookie } })
}

describe('GET /places/suggestions (RF05)', () => {
  it('returns suggestions biased to the user location', async () => {
    const fetchSpy = mockMapbox({
      suggestions: [
        {
          mapbox_id: 'dXJuOm1ieHBvaTox',
          name: 'PUC Minas',
          feature_type: 'poi',
          full_address: 'Av. Artur da Silva Bernardes, Betim, 32604, Brasil',
        },
        {
          mapbox_id: 'dXJuOm1ieHBsYzox',
          name: 'Betim',
          feature_type: 'place',
          place_formatted: 'Minas Gerais, Brasil',
        },
      ],
    })

    const response = await get('/places/suggestions', {
      q: 'PUC Minas Betim',
      sessionToken,
      lat: '-19.9678',
      lng: '-44.1983',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      suggestions: [
        {
          id: 'dXJuOm1ieHBvaTox',
          name: 'PUC Minas',
          address: 'Av. Artur da Silva Bernardes, Betim, 32604, Brasil',
          type: 'poi',
        },
        {
          id: 'dXJuOm1ieHBsYzox',
          name: 'Betim',
          address: 'Minas Gerais, Brasil',
          type: 'place',
        },
      ],
    })

    const url = new URL(String(fetchSpy.mock.calls[0]?.[0]))
    expect(url.pathname).toBe('/search/searchbox/v1/suggest')
    expect(url.searchParams.get('q')).toBe('PUC Minas Betim')
    expect(url.searchParams.get('session_token')).toBe(sessionToken)
    expect(url.searchParams.get('proximity')).toBe('-44.1983,-19.9678')
    expect(url.searchParams.get('country')).toBe('br')
  })

  it('works without the user location', async () => {
    const fetchSpy = mockMapbox({ suggestions: [] })

    const response = await get('/places/suggestions', { q: 'Mineirão', sessionToken })

    expect(response.statusCode).toBe(200)
    const url = new URL(String(fetchSpy.mock.calls[0]?.[0]))
    expect(url.searchParams.has('proximity')).toBe(false)
  })

  it('validates the query and the session token', async () => {
    expect((await get('/places/suggestions', { q: 'PU', sessionToken })).statusCode).toBe(
      400,
    )
    expect(
      (await get('/places/suggestions', { q: 'PUC Minas', sessionToken: 'abc' }))
        .statusCode,
    ).toBe(400)
  })

  it('returns 502 when Mapbox fails', async () => {
    mockMapbox({ message: 'Forbidden' }, 403)

    const response = await get('/places/suggestions', { q: 'PUC Minas', sessionToken })

    expect(response.statusCode).toBe(502)
  })

  it('requires a session', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/places/suggestions',
      query: { q: 'PUC Minas', sessionToken },
    })

    expect(response.statusCode).toBe(401)
  })
})

describe('GET /places/:id', () => {
  it('returns the coordinates of the chosen place', async () => {
    const fetchSpy = mockMapbox({
      type: 'FeatureCollection',
      features: [
        {
          geometry: { type: 'Point', coordinates: [-44.19906, -19.95453] },
          properties: {
            mapbox_id: 'dXJuOm1ieHBvaTox',
            name: 'PUC Minas',
            full_address: 'Av. Artur da Silva Bernardes, Betim, 32604, Brasil',
          },
        },
      ],
    })

    const response = await get('/places/dXJuOm1ieHBvaTox', { sessionToken })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      id: 'dXJuOm1ieHBvaTox',
      name: 'PUC Minas',
      address: 'Av. Artur da Silva Bernardes, Betim, 32604, Brasil',
      latitude: -19.95453,
      longitude: -44.19906,
    })

    const url = new URL(String(fetchSpy.mock.calls[0]?.[0]))
    expect(url.pathname).toBe('/search/searchbox/v1/retrieve/dXJuOm1ieHBvaTox')
    expect(url.searchParams.get('session_token')).toBe(sessionToken)
  })

  it('returns 404 when the place does not exist', async () => {
    mockMapbox({ type: 'FeatureCollection', features: [] })

    expect((await get('/places/unknown', { sessionToken })).statusCode).toBe(404)
  })
})
