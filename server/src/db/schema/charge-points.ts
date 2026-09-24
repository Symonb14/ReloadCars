import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { point } from './point.ts'

const timestamps = {
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}

/** Establishment that pays to have its charge points listed. */
export const partner = pgTable('partner', {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text().notNull(),
  document: text(), // CNPJ
  email: text(),
  phone: text(),
  active: boolean().default(true).notNull(),
  ...timestamps,
})

export const chargePointSources = ['partner', 'ocm'] as const

export const chargePoint = pgTable(
  'charge_point',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    source: text({ enum: chargePointSources }).notNull(),
    partnerId: text().references(() => partner.id, { onDelete: 'cascade' }),
    // Open Charge Map id, used to update points on re-import.
    externalId: text().unique(),
    name: text().notNull(),
    description: text(),
    address: text(),
    location: point().notNull(),
    powerKw: numeric({ precision: 6, scale: 1, mode: 'number' }),
    pricePerKwhCents: integer(),
    connectors: text().array().default(sql`'{}'::text[]`).notNull(),
    openingHours: text(),
    // Credit required by the data source (e.g. Open Charge Map, CC BY 4.0).
    attribution: text(),
    active: boolean().default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    // Distances are computed on geography (meters); index that expression.
    index('charge_point_location_geog_idx').using(
      'gist',
      sql`(${table.location}::geography)`,
    ),
    check(
      'charge_point_source_check',
      sql`(${table.source} = 'partner' and ${table.partnerId} is not null)
        or (${table.source} = 'ocm' and ${table.externalId} is not null)`,
    ),
    check(
      'charge_point_price_check',
      sql`${table.pricePerKwhCents} is null or ${table.pricePerKwhCents} >= 0`,
    ),
  ],
)
