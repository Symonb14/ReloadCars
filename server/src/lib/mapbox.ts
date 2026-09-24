import { env } from '../env.ts'

export type Coordinates = { latitude: number; longitude: number }

export type DrivingRoute = {
  distanceMeters: number
  durationSeconds: number
  coordinates: Coordinates[]
}

export type PlaceSuggestion = {
  id: string
  name: string
  address: string | null
  type: string
}

export type Place = Coordinates & {
  id: string
  name: string
  address: string | null
}

export class MapboxError extends Error {}

// Keeps the whole request under the 10 s budget of RNF01.
const TIMEOUT_MS = 8_000

const SEARCH_BOX_URL = 'https://api.mapbox.com/search/searchbox/v1'

/** Fastest driving route between two points (Mapbox Directions API). */
export async function getDrivingRoute(
  from: Coordinates,
  to: Coordinates,
): Promise<DrivingRoute | null> {
  const path = [from, to].map((c) => `${c.longitude},${c.latitude}`).join(';')
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${path}`)
  url.searchParams.set('geometries', 'geojson')
  url.searchParams.set('overview', 'full')

  const { response, body } = await request<MapboxDirections>(url)

  if (body?.code === 'NoRoute' || body?.code === 'NoSegment') return null
  if (!response.ok || body?.code !== 'Ok' || !body.routes?.[0]) {
    throw new MapboxError(`Mapbox responded ${response.status} ${body?.code ?? ''}`)
  }

  const route = body.routes[0]
  return {
    distanceMeters: Math.round(route.distance),
    durationSeconds: Math.round(route.duration),
    coordinates: route.geometry.coordinates.map(([longitude, latitude]) => ({
      latitude,
      longitude,
    })),
  }
}

/**
 * Type-ahead suggestions (Search Box /suggest). Calls sharing a `sessionToken` plus the
 * final /retrieve are billed as one search session.
 */
export async function suggestPlaces(params: {
  query: string
  sessionToken: string
  proximity?: Coordinates
  limit?: number
}): Promise<PlaceSuggestion[]> {
  const url = new URL(`${SEARCH_BOX_URL}/suggest`)
  url.searchParams.set('q', params.query)
  url.searchParams.set('session_token', params.sessionToken)
  url.searchParams.set('language', 'pt')
  url.searchParams.set('country', 'br')
  url.searchParams.set('limit', String(params.limit ?? 8))
  if (params.proximity) {
    url.searchParams.set(
      'proximity',
      `${params.proximity.longitude},${params.proximity.latitude}`,
    )
  }

  const { response, body } = await request<MapboxSuggestions>(url)
  if (!response.ok || !body?.suggestions) {
    throw new MapboxError(`Mapbox suggest responded ${response.status}`)
  }

  return body.suggestions.map((suggestion) => ({
    id: suggestion.mapbox_id,
    name: suggestion.name,
    address: suggestion.full_address ?? suggestion.place_formatted ?? null,
    type: suggestion.feature_type,
  }))
}

/** Coordinates and details of a suggestion (Search Box /retrieve). */
export async function retrievePlace(
  id: string,
  sessionToken: string,
): Promise<Place | null> {
  const url = new URL(`${SEARCH_BOX_URL}/retrieve/${encodeURIComponent(id)}`)
  url.searchParams.set('session_token', sessionToken)
  url.searchParams.set('language', 'pt')

  const { response, body } = await request<MapboxFeatureCollection>(url)
  if (response.status === 404) return null
  if (!response.ok || !body?.features) {
    throw new MapboxError(`Mapbox retrieve responded ${response.status}`)
  }

  const feature = body.features[0]
  if (!feature) return null

  const [longitude, latitude] = feature.geometry.coordinates
  return {
    id: feature.properties.mapbox_id,
    name: feature.properties.name,
    address:
      feature.properties.full_address ?? feature.properties.place_formatted ?? null,
    latitude,
    longitude,
  }
}

async function request<T>(url: URL) {
  url.searchParams.set('access_token', env.MAPBOX_ACCESS_TOKEN)

  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch (error) {
    throw new MapboxError('Mapbox request failed', { cause: error })
  }

  const body = (await response.json().catch(() => null)) as T | null
  return { response, body }
}

type MapboxDirections = {
  code: string
  routes?: {
    distance: number
    duration: number
    geometry: { coordinates: [number, number][] }
  }[]
}

type MapboxSuggestions = {
  suggestions?: {
    mapbox_id: string
    name: string
    feature_type: string
    full_address?: string
    place_formatted?: string
  }[]
}

type MapboxFeatureCollection = {
  features?: {
    geometry: { coordinates: [number, number] }
    properties: {
      mapbox_id: string
      name: string
      full_address?: string
      place_formatted?: string
    }
  }[]
}
