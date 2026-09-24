/**
 * Imports public charge points from Open Charge Map (CC BY 4.0) around a location.
 * Re-running updates existing points (matched by externalId).
 *
 *   npm run import:ocm                                  # Betim, 60 km
 *   npm run import:ocm -- --lat -19.92 --lng -43.94 --radius-km 30
 */
import { parseArgs } from 'node:util'
import { sql } from 'drizzle-orm'
import { db } from '../db/client.ts'
import { chargePoint } from '../db/schema/index.ts'
import { env } from '../env.ts'

const BETIM = { lat: '-19.9678', lng: '-44.1983' }

const { values } = parseArgs({
  options: {
    lat: { type: 'string', default: BETIM.lat },
    lng: { type: 'string', default: BETIM.lng },
    'radius-km': { type: 'string', default: '60' },
  },
})

if (!env.OCM_API_KEY) {
  console.error('OCM_API_KEY is not set. Get a free key at https://openchargemap.org')
  process.exit(1)
}

const url = new URL('https://api.openchargemap.io/v3/poi/')
url.search = new URLSearchParams({
  output: 'json',
  countrycode: 'BR',
  latitude: values.lat,
  longitude: values.lng,
  distance: values['radius-km'],
  distanceunit: 'KM',
  maxresults: '1000',
  compact: 'false', // include connection type and data provider titles
  verbose: 'false',
}).toString()

const response = await fetch(url, {
  headers: { 'X-API-Key': env.OCM_API_KEY, 'User-Agent': 'ReloadCars/1.0' },
})

if (!response.ok) {
  console.error(`Open Charge Map responded ${response.status}: ${await response.text()}`)
  process.exit(1)
}

const pois = (await response.json()) as OcmPoi[]
const rows = pois.flatMap((poi) => {
  const row = toChargePoint(poi)
  return row ? [row] : []
})

for (const row of rows) {
  const { externalId: _, ...fields } = row
  await db
    .insert(chargePoint)
    .values(row)
    .onConflictDoUpdate({ target: chargePoint.externalId, set: fields })
}

const [{ total } = { total: 0 }] = await db
  .select({ total: sql<number>`count(*)::int` })
  .from(chargePoint)
  .where(sql`${chargePoint.source} = 'ocm'`)

console.log(
  `Open Charge Map: ${rows.length} pontos importados/atualizados (${pois.length - rows.length} ignorados). Total de pontos públicos: ${total}.`,
)
process.exit(0)

function toChargePoint(poi: OcmPoi): typeof chargePoint.$inferInsert | null {
  const info = poi.AddressInfo
  if (!info || typeof info.Latitude !== 'number' || typeof info.Longitude !== 'number') {
    return null
  }

  const connections = poi.Connections ?? []
  const powers = connections.map((c) => c.PowerKW).filter((p) => typeof p === 'number')
  const connectors = [
    ...new Set(connections.map((c) => c.ConnectionType?.Title).filter(Boolean)),
  ] as string[]

  const provider = poi.DataProvider?.Title
  const attribution = [
    'Dados: Open Charge Map (CC BY 4.0)',
    provider && !/open charge map/i.test(provider) ? `fonte original: ${provider}` : null,
  ]
    .filter(Boolean)
    .join(', ')

  const description = [
    poi.UsageCost ? `Custo informado: ${poi.UsageCost}.` : null,
    poi.GeneralComments ?? null,
  ]
    .filter(Boolean)
    .join(' ')

  return {
    source: 'ocm',
    externalId: String(poi.ID),
    name: info.Title?.trim() || 'Ponto de recarga',
    description: description || null,
    address:
      [info.AddressLine1, info.Town, info.StateOrProvince].filter(Boolean).join(', ') ||
      null,
    location: { latitude: info.Latitude, longitude: info.Longitude },
    powerKw: powers.length ? Math.max(...powers) : null,
    pricePerKwhCents: null,
    connectors,
    openingHours: info.AccessComments ?? null,
    attribution,
    active: poi.StatusType?.IsOperational !== false,
  }
}

type OcmPoi = {
  ID: number
  UsageCost?: string
  GeneralComments?: string
  DataProvider?: { Title?: string }
  StatusType?: { IsOperational?: boolean }
  AddressInfo?: {
    Title?: string
    AddressLine1?: string
    Town?: string
    StateOrProvince?: string
    AccessComments?: string
    Latitude?: number
    Longitude?: number
  }
  Connections?: { PowerKW?: number; ConnectionType?: { Title?: string } }[]
}
