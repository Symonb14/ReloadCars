import { env } from '../env.ts'

export type Coordinates = { latitude: number; longitude: number }

export type DrivingRoute = {
  distanceMeters: number
  durationSeconds: number
  coordinates: Coordinates[]
}

export class MapboxError extends Error {}

// Keeps the whole request under the 10 s budget of RNF01.
const TIMEOUT_MS = 8_000

/** Fastest driving route between two points (Mapbox Directions API). */
export async function getDrivingRoute(
  from: Coordinates,
  to: Coordinates,
): Promise<DrivingRoute | null> {
  const path = [from, to].map((c) => `${c.longitude},${c.latitude}`).join(';')
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${path}`)
  url.searchParams.set('geometries', 'geojson')
  url.searchParams.set('overview', 'full')
  url.searchParams.set('access_token', env.MAPBOX_ACCESS_TOKEN)

  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch (error) {
    throw new MapboxError('Mapbox request failed', { cause: error })
  }

  const body = (await response.json().catch(() => null)) as MapboxDirections | null

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

type MapboxDirections = {
  code: string
  routes?: {
    distance: number
    duration: number
    geometry: { coordinates: [number, number][] }
  }[]
}
