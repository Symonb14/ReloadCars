/**
 * Imports public charge points from Open Charge Map (CC BY 4.0).
 * Re-running updates existing points (matched by externalId).
 *
 *   npm run import:ocm                                      # all of Brazil (~1.7k points)
 *   npm run import:ocm -- --lat -19.92 --lng -43.94 --radius-km 30   # one region
 *
 * The national import also deactivates public points that left Open Charge Map;
 * a regional import cannot tell, so it deactivates nothing.
 */
import { parseArgs } from 'node:util'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '../db/client.ts'
import { chargePoint } from '../db/schema/index.ts'
import { env } from '../env.ts'
import { importPublicChargePoints } from '../lib/import-charge-points.ts'
import { type OcmPoi, toChargePoint } from '../lib/open-charge-map.ts'

const { values } = parseArgs({
  options: {
    lat: { type: 'string' },
    lng: { type: 'string' },
    'radius-km': { type: 'string', default: '60' },
  },
})

if (!env.OCM_API_KEY) {
  console.error('OCM_API_KEY is not set. Get a free key at https://openchargemap.org')
  process.exit(1)
}

const regional = values.lat !== undefined || values.lng !== undefined
if (regional && (values.lat === undefined || values.lng === undefined)) {
  console.error('For a regional import pass both --lat and --lng.')
  process.exit(1)
}

const params = new URLSearchParams({
  output: 'json',
  countrycode: 'BR',
  // Brazil has ~1.7k points: one request covers the whole country.
  maxresults: '10000',
  compact: 'false', // include connection type and data provider titles
  verbose: 'false',
})
if (regional) {
  params.set('latitude', values.lat ?? '')
  params.set('longitude', values.lng ?? '')
  params.set('distance', values['radius-km'])
  params.set('distanceunit', 'KM')
}

const startedAt = Date.now()
const response = await fetch(`https://api.openchargemap.io/v3/poi/?${params}`, {
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

const { upserted, deactivated } = await importPublicChargePoints(rows, {
  deactivateMissing: !regional,
})

const [{ active } = { active: 0 }] = await db
  .select({ active: sql<number>`count(*)::int` })
  .from(chargePoint)
  .where(and(eq(chargePoint.source, 'ocm'), eq(chargePoint.active, true)))

const scope = regional
  ? `região (${values.lat}, ${values.lng}; ${values['radius-km']} km)`
  : 'Brasil inteiro'
console.log(
  [
    `Open Charge Map — ${scope}, ${((Date.now() - startedAt) / 1000).toFixed(1)} s:`,
    `  ${upserted} importados/atualizados, ${pois.length - rows.length} ignorados (sem coordenadas)`,
    `  ${deactivated} desativados (saíram do Open Charge Map)`,
    `  ${active} pontos públicos ativos no total`,
  ].join('\n'),
)
process.exit(0)
