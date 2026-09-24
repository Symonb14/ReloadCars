import { and, eq, notInArray, sql } from 'drizzle-orm'
import { db } from '../db/client.ts'
import { chargePoint } from '../db/schema/index.ts'

type ChargePointRow = typeof chargePoint.$inferInsert & { externalId: string }

const BATCH_SIZE = 500

// Fields refreshed on re-import (everything the source controls).
const UPDATED_COLUMNS = [
  'name',
  'description',
  'address',
  'location',
  'powerKw',
  'pricePerKwhCents',
  'connectors',
  'openingHours',
  'attribution',
  'active',
] as const

/**
 * Upserts public (Open Charge Map) points by externalId, in batches.
 *
 * With `deactivateMissing` (use only when `rows` covers the whole source, i.e. the
 * national import), public points that are no longer in the source are deactivated —
 * not deleted, so reloads keep pointing to them.
 */
export async function importPublicChargePoints(
  rows: ChargePointRow[],
  options: { deactivateMissing: boolean },
) {
  // excluded.<column> uses the database name; with casing: 'snake_case' Drizzle keeps
  // the camelCase key as the column name and only converts it when building queries.
  const set = Object.fromEntries(
    UPDATED_COLUMNS.map((key) => [key, sql.raw(`excluded."${toSnakeCase(key)}"`)]),
  )

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    await db
      .insert(chargePoint)
      .values(rows.slice(start, start + BATCH_SIZE))
      .onConflictDoUpdate({
        target: chargePoint.externalId,
        set: { ...set, updatedAt: sql`now()` },
      })
  }

  let deactivated = 0
  if (options.deactivateMissing && rows.length > 0) {
    const result = await db
      .update(chargePoint)
      .set({ active: false })
      .where(
        and(
          eq(chargePoint.source, 'ocm'),
          eq(chargePoint.active, true),
          notInArray(
            chargePoint.externalId,
            rows.map((row) => row.externalId),
          ),
        ),
      )
      .returning({ id: chargePoint.id })
    deactivated = result.length
  }

  return { upserted: rows.length, deactivated }
}

function toSnakeCase(key: string) {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}
