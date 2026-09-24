import type { chargePoint } from '../db/schema/index.ts'

/** Subset of an Open Charge Map POI (`/v3/poi?compact=false`) that we import. */
export type OcmPoi = {
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

// Open Charge Map connection type titles → labels shown in the app.
const CONNECTOR_LABELS: [RegExp, string | null][] = [
  [/^unknown$/i, null],
  [/^ccs \(type 2\)/i, 'CCS2'],
  [/^ccs \(type 1\)/i, 'CCS1'],
  [/^chademo/i, 'CHAdeMO'],
  [/^type 2 \(tethered/i, 'Tipo 2 (cabo)'],
  [/^type 2/i, 'Tipo 2 (tomada)'],
  [/^type 1/i, 'Tipo 1'],
  [/^gb-?t ac/i, 'GB/T AC'],
  [/^gb-?t dc/i, 'GB/T DC'],
  [/tesla|nacs/i, 'Tesla'],
]

/** Translates a connector title; returns null for "Unknown". */
export function normalizeConnector(title: string): string | null {
  const trimmed = title.trim()
  for (const [pattern, label] of CONNECTOR_LABELS) {
    if (pattern.test(trimmed)) return label
  }
  return trimmed || null
}

/** Joins address parts, dropping empty and repeated pieces ("683, , Betim, Betim"). */
export function formatAddress(...parts: (string | undefined)[]): string | null {
  const pieces: string[] = []
  for (const piece of parts.flatMap((part) => part?.split(',') ?? [])) {
    const trimmed = piece.trim()
    const repeated = pieces.some((p) => p.toLowerCase() === trimmed.toLowerCase())
    if (trimmed && !repeated) pieces.push(trimmed)
  }
  return pieces.length > 0 ? pieces.join(', ') : null
}

/** Maps a POI to a charge point row, or null when it has no coordinates. */
export function toChargePoint(
  poi: OcmPoi,
): (typeof chargePoint.$inferInsert & { externalId: string }) | null {
  const info = poi.AddressInfo
  if (!info || typeof info.Latitude !== 'number' || typeof info.Longitude !== 'number') {
    return null
  }

  const connections = poi.Connections ?? []
  const powers = connections.flatMap((c) =>
    typeof c.PowerKW === 'number' ? [c.PowerKW] : [],
  )
  const connectors = [
    ...new Set(
      connections.flatMap((c) => {
        const label =
          c.ConnectionType?.Title && normalizeConnector(c.ConnectionType.Title)
        return label ? [label] : []
      }),
    ),
  ]

  const provider = poi.DataProvider?.Title
  const attribution = [
    'Dados: Open Charge Map (CC BY 4.0)',
    provider && !/open charge map/i.test(provider) ? `fonte original: ${provider}` : null,
  ]
    .filter(Boolean)
    .join(', ')

  const description = [
    poi.UsageCost ? `Custo informado: ${poi.UsageCost.trim()}.` : null,
    poi.GeneralComments?.trim() || null,
  ]
    .filter(Boolean)
    .join(' ')

  return {
    source: 'ocm',
    externalId: String(poi.ID),
    name: info.Title?.trim() || 'Ponto de recarga',
    description: description || null,
    address: formatAddress(info.AddressLine1, info.Town, info.StateOrProvince),
    location: { latitude: info.Latitude, longitude: info.Longitude },
    powerKw: powers.length > 0 ? Math.max(...powers) : null,
    pricePerKwhCents: null,
    connectors,
    openingHours: info.AccessComments?.trim() || null,
    attribution,
    active: poi.StatusType?.IsOperational !== false,
  }
}
