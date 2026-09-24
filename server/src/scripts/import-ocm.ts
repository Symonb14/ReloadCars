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
import { type OcmPoi, toChargePoint } from '../lib/open-charge-map.ts'

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
