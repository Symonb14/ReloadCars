import { and, eq, or } from 'drizzle-orm'
import { z } from 'zod'
import { chargePoint, chargePointSources, partner } from '../db/schema/index.ts'
import type { Point } from '../db/schema/point.ts'

/** Charge point as returned by the API (shared by /charge-points and /trips). */
export const chargePointSchema = z.object({
  id: z.string(),
  source: z.enum(chargePointSources),
  name: z.string(),
  description: z.string().nullable(),
  address: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  powerKw: z.number().nullable(),
  pricePerKwhCents: z.number().int().nullable(),
  connectors: z.array(z.string()),
  openingHours: z.string().nullable(),
  attribution: z.string().nullable(),
  partnerName: z.string().nullable(),
})

/** Columns to select; requires `leftJoin(partner, ...)`. */
export const chargePointColumns = {
  id: chargePoint.id,
  source: chargePoint.source,
  name: chargePoint.name,
  description: chargePoint.description,
  address: chargePoint.address,
  location: chargePoint.location,
  powerKw: chargePoint.powerKw,
  pricePerKwhCents: chargePoint.pricePerKwhCents,
  connectors: chargePoint.connectors,
  openingHours: chargePoint.openingHours,
  attribution: chargePoint.attribution,
  partnerName: partner.name,
}

/** Active points whose partner (if any) is also active. */
export const isListed = and(
  eq(chargePoint.active, true),
  or(eq(chargePoint.source, 'ocm'), eq(partner.active, true)),
)

/** Flattens the PostGIS point into latitude/longitude fields. */
export function toChargePointResponse<T extends { location: Point }>({
  location,
  ...row
}: T) {
  return { ...row, latitude: location.latitude, longitude: location.longitude }
}
