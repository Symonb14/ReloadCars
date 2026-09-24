import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.ts'
import { db } from '../src/db/client.ts'
import { chargePoint, partner, reload, user } from '../src/db/schema/index.ts'
import { resetDatabase, signUp } from './helpers.ts'

const app = buildApp()
let cookie: string

const location = { latitude: -19.9678, longitude: -44.1983 }

beforeAll(async () => {
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(async () => {
  await resetDatabase()
  cookie = (await signUp(app)).cookie

  await db.insert(partner).values({ id: 'p', name: 'Posto ABC' })
  await db.insert(chargePoint).values([
    {
      id: 'partner-point',
      source: 'partner',
      partnerId: 'p',
      name: 'Posto ABC',
      address: 'Av. Governador Valadares, Betim',
      location,
      powerKw: 22,
      pricePerKwhCents: 180,
    },
    {
      id: 'public-point',
      source: 'ocm',
      externalId: '1',
      name: 'Shopping Público',
      location,
      powerKw: 50,
    },
    {
      id: 'no-power-point',
      source: 'ocm',
      externalId: '2',
      name: 'Sem potência',
      location,
    },
    {
      id: 'inactive-point',
      source: 'partner',
      partnerId: 'p',
      name: 'Desativado',
      active: false,
      location,
      powerKw: 22,
    },
  ])
})

function createReload(body: Record<string, unknown>, sessionCookie = cookie) {
  return app.inject({
    method: 'POST',
    url: '/reloads',
    payload: body,
    headers: { cookie: sessionCookie },
  })
}

function listReloads(sessionCookie = cookie) {
  return app.inject({
    method: 'GET',
    url: '/reloads',
    headers: { cookie: sessionCookie },
  })
}

describe('POST /reloads (RF11, RF06)', () => {
  it('estimates energy and uses the partner price', async () => {
    const response = await createReload({
      chargePointId: 'partner-point',
      durationMinutes: 90,
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      chargePointId: 'partner-point',
      chargePointName: 'Posto ABC',
      chargePointAddress: 'Av. Governador Valadares, Betim',
      durationMinutes: 90,
      energyKwh: 33,
      energyEstimated: true,
      pricePerKwhCents: 180,
      totalCents: 5940,
    })
    expect(Date.parse(response.json().chargedAt)).not.toBeNaN()
  })

  it('keeps the partner price over an informed one', async () => {
    const response = await createReload({
      chargePointId: 'partner-point',
      durationMinutes: 60,
      energyKwh: 15.5,
      pricePerKwhCents: 1,
    })

    expect(response.json()).toMatchObject({
      energyKwh: 15.5,
      energyEstimated: false,
      pricePerKwhCents: 180,
      totalCents: 2790,
    })
  })

  it('uses the informed price at a public point, or none', async () => {
    const priced = await createReload({
      chargePointId: 'public-point',
      durationMinutes: 30,
      pricePerKwhCents: 250,
    })
    expect(priced.json()).toMatchObject({ energyKwh: 25, totalCents: 6250 })

    const unpriced = await createReload({
      chargePointId: 'public-point',
      durationMinutes: 30,
    })
    expect(unpriced.json()).toMatchObject({ pricePerKwhCents: null, totalCents: null })
  })

  it('asks for energy when the point has no power', async () => {
    const withoutEnergy = await createReload({
      chargePointId: 'no-power-point',
      durationMinutes: 30,
    })
    expect(withoutEnergy.statusCode).toBe(400)
    expect(withoutEnergy.json().message).toContain('Informe a energia')

    const withEnergy = await createReload({
      chargePointId: 'no-power-point',
      durationMinutes: 30,
      energyKwh: 10,
    })
    expect(withEnergy.statusCode).toBe(201)
  })

  it.each(['inactive-point', 'missing'])('returns 404 for %s', async (chargePointId) => {
    const response = await createReload({ chargePointId, durationMinutes: 30 })

    expect(response.statusCode).toBe(404)
  })

  it.each([0, 1441, 1.5])('rejects durationMinutes = %s', async (durationMinutes) => {
    const response = await createReload({
      chargePointId: 'partner-point',
      durationMinutes,
    })

    expect(response.statusCode).toBe(400)
  })

  it('requires a session', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/reloads',
      payload: { chargePointId: 'partner-point', durationMinutes: 30 },
    })

    expect(response.statusCode).toBe(401)
  })
})

describe('GET /reloads (RF12)', () => {
  it('lists the newest first with the summary of the current month', async () => {
    await createReload({ chargePointId: 'partner-point', durationMinutes: 60 }) // 22 kWh, R$ 39,60
    await createReload({ chargePointId: 'public-point', durationMinutes: 30 }) // 25 kWh, no price

    // A reload from two months ago: listed, but not in this month's summary.
    const [me] = await db.select({ id: user.id }).from(user)
    await db.insert(reload).values({
      userId: me?.id ?? '',
      chargePointId: 'partner-point',
      chargePointName: 'Posto ABC',
      chargedAt: sql`now() - interval '2 months'`,
      durationMinutes: 60,
      energyKwh: 22,
      energyEstimated: true,
      pricePerKwhCents: 180,
      totalCents: 3960,
    })

    const response = await listReloads()

    expect(response.statusCode).toBe(200)
    const { reloads, month } = response.json()
    expect(reloads.map((r: { chargePointName: string }) => r.chargePointName)).toEqual([
      'Shopping Público',
      'Posto ABC',
      'Posto ABC',
    ])
    expect(month).toEqual({ count: 2, energyKwh: 47, totalCents: 3960 })
  })

  it("does not show other drivers' reloads", async () => {
    await createReload({ chargePointId: 'partner-point', durationMinutes: 60 })
    const other = await signUp(app)

    const response = await listReloads(other.cookie)

    expect(response.json()).toEqual({
      reloads: [],
      month: { count: 0, energyKwh: 0, totalCents: 0 },
    })
  })

  it('keeps the history when the charge point is deleted', async () => {
    await createReload({ chargePointId: 'partner-point', durationMinutes: 60 })
    await db.delete(chargePoint).where(eq(chargePoint.id, 'partner-point'))

    const [entry] = (await listReloads()).json().reloads

    expect(entry).toMatchObject({ chargePointId: null, chargePointName: 'Posto ABC' })
  })
})

describe('DELETE /reloads/:id', () => {
  it('deletes an own reload', async () => {
    const { id } = (
      await createReload({ chargePointId: 'partner-point', durationMinutes: 60 })
    ).json()

    const response = await app.inject({
      method: 'DELETE',
      url: `/reloads/${id}`,
      headers: { cookie },
    })

    expect(response.statusCode).toBe(204)
    expect((await listReloads()).json().reloads).toEqual([])
  })

  it("cannot delete another driver's reload", async () => {
    const { id } = (
      await createReload({ chargePointId: 'partner-point', durationMinutes: 60 })
    ).json()
    const other = await signUp(app)

    const response = await app.inject({
      method: 'DELETE',
      url: `/reloads/${id}`,
      headers: { cookie: other.cookie },
    })

    expect(response.statusCode).toBe(404)
    expect((await listReloads()).json().reloads).toHaveLength(1)
  })
})
