import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/client.ts'
import { chargePoint, partner } from '../src/db/schema/index.ts'
import { importPublicChargePoints } from '../src/lib/import-charge-points.ts'
import { resetDatabase } from './helpers.ts'

function publicPoint(
  externalId: string,
  overrides: Partial<Omit<typeof chargePoint.$inferInsert, 'externalId'>> = {},
) {
  return {
    source: 'ocm' as const,
    externalId,
    name: `Ponto ${externalId}`,
    location: { latitude: -19.9, longitude: -44.1 },
    connectors: ['CCS2'],
    attribution: 'Dados: Open Charge Map (CC BY 4.0)',
    active: true,
    ...overrides,
  }
}

async function publicPoints() {
  const rows = await db
    .select({
      externalId: chargePoint.externalId,
      name: chargePoint.name,
      active: chargePoint.active,
    })
    .from(chargePoint)
    .where(eq(chargePoint.source, 'ocm'))
  return rows.sort((a, b) => String(a.externalId).localeCompare(String(b.externalId)))
}

beforeEach(async () => {
  await resetDatabase()
})

describe('importPublicChargePoints', () => {
  it('is idempotent and updates existing points', async () => {
    await importPublicChargePoints([publicPoint('1'), publicPoint('2')], {
      deactivateMissing: false,
    })
    await importPublicChargePoints(
      [publicPoint('1', { name: 'Renomeado' }), publicPoint('2')],
      { deactivateMissing: false },
    )

    expect(await publicPoints()).toEqual([
      { externalId: '1', name: 'Renomeado', active: true },
      { externalId: '2', name: 'Ponto 2', active: true },
    ])
  })

  it('writes large imports in batches', async () => {
    const rows = Array.from({ length: 1234 }, (_, index) => publicPoint(String(index)))

    const result = await importPublicChargePoints(rows, { deactivateMissing: false })

    expect(result.upserted).toBe(1234)
    expect(await publicPoints()).toHaveLength(1234)
  })

  it('national import deactivates points that left the source, keeping partners', async () => {
    await db.insert(partner).values({ id: 'p', name: 'Parceiro' })
    await db.insert(chargePoint).values({
      source: 'partner',
      partnerId: 'p',
      name: 'Do parceiro',
      location: { latitude: -19.9, longitude: -44.1 },
    })
    await importPublicChargePoints([publicPoint('1'), publicPoint('2')], {
      deactivateMissing: true,
    })

    const result = await importPublicChargePoints([publicPoint('1')], {
      deactivateMissing: true,
    })

    expect(result.deactivated).toBe(1)
    expect(await publicPoints()).toEqual([
      { externalId: '1', name: 'Ponto 1', active: true },
      { externalId: '2', name: 'Ponto 2', active: false },
    ])
    const [partnerPoint] = await db
      .select({ active: chargePoint.active })
      .from(chargePoint)
      .where(eq(chargePoint.source, 'partner'))
    expect(partnerPoint?.active).toBe(true)
  })

  it('regional import never deactivates', async () => {
    await importPublicChargePoints([publicPoint('1'), publicPoint('2')], {
      deactivateMissing: true,
    })

    const result = await importPublicChargePoints([publicPoint('1')], {
      deactivateMissing: false,
    })

    expect(result.deactivated).toBe(0)
    expect((await publicPoints()).every((point) => point.active)).toBe(true)
  })

  it('reactivates a point that comes back', async () => {
    await importPublicChargePoints([publicPoint('1'), publicPoint('2')], {
      deactivateMissing: true,
    })
    await importPublicChargePoints([publicPoint('1')], { deactivateMissing: true })

    await importPublicChargePoints([publicPoint('1'), publicPoint('2')], {
      deactivateMissing: true,
    })

    expect((await publicPoints()).every((point) => point.active)).toBe(true)
  })
})
