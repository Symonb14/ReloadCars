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
import { user } from './auth.ts'
import { chargePoint } from './charge-points.ts'

/** A charge the driver registered (RF11), with the values used at that moment. */
export const reload = pgTable(
  'reload',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Kept as null if the point is deleted; name/address copies keep the history.
    chargePointId: text().references(() => chargePoint.id, { onDelete: 'set null' }),
    chargePointName: text().notNull(),
    chargePointAddress: text(),
    chargedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    durationMinutes: integer().notNull(),
    energyKwh: numeric({ precision: 8, scale: 2, mode: 'number' }).notNull(),
    // True when estimated as power × time instead of informed by the driver.
    energyEstimated: boolean().notNull(),
    // Price copied at registration time; null when unknown.
    pricePerKwhCents: integer(),
    totalCents: integer(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('reload_user_charged_at_idx').on(table.userId, table.chargedAt.desc()),
    check('reload_duration_check', sql`${table.durationMinutes} between 1 and 1440`),
    check('reload_energy_check', sql`${table.energyKwh} > 0`),
    check(
      'reload_price_check',
      sql`${table.pricePerKwhCents} is null or ${table.pricePerKwhCents} >= 0`,
    ),
    check(
      'reload_total_check',
      sql`(${table.totalCents} is null) = (${table.pricePerKwhCents} is null)`,
    ),
  ],
)
