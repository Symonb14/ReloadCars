import { describe, expect, it } from 'vitest'
import { calculateReload, EnergyUnknownError } from '../src/lib/reload-calculation.ts'

const partnerPoint = { powerKw: 22, pricePerKwhCents: 180 }
const publicPoint = { powerKw: 50, pricePerKwhCents: null }

describe('calculateReload', () => {
  it('reproduces the MVP example: 10 kW for 3 h at R$ 1,00/kWh', () => {
    expect(
      calculateReload({ durationMinutes: 180 }, { powerKw: 10, pricePerKwhCents: 100 }),
    ).toEqual({
      energyKwh: 30,
      energyEstimated: true,
      pricePerKwhCents: 100,
      totalCents: 3000,
    })
  })

  it('estimates energy as power × time', () => {
    expect(calculateReload({ durationMinutes: 90 }, partnerPoint)).toMatchObject({
      energyKwh: 33,
      energyEstimated: true,
      totalCents: 5940,
    })
  })

  it('uses the energy informed by the driver', () => {
    expect(
      calculateReload({ durationMinutes: 90, energyKwh: 18.456 }, partnerPoint),
    ).toMatchObject({ energyKwh: 18.46, energyEstimated: false, totalCents: 3323 })
  })

  it('rounds energy to 2 decimals and the total to cents', () => {
    const result = calculateReload(
      { durationMinutes: 50 },
      { powerKw: 7.4, pricePerKwhCents: 199 },
    )
    expect(result.energyKwh).toBe(6.17)
    expect(result.totalCents).toBe(1228)
  })

  it("keeps the partner's price even if the driver informs another", () => {
    expect(
      calculateReload({ durationMinutes: 60, pricePerKwhCents: 50 }, partnerPoint),
    ).toMatchObject({ pricePerKwhCents: 180, totalCents: 3960 })
  })

  it('uses the informed price when the point has none', () => {
    expect(
      calculateReload({ durationMinutes: 30, pricePerKwhCents: 250 }, publicPoint),
    ).toMatchObject({ energyKwh: 25, pricePerKwhCents: 250, totalCents: 6250 })
  })

  it('leaves price and total empty when nobody knows the price', () => {
    expect(calculateReload({ durationMinutes: 30 }, publicPoint)).toMatchObject({
      pricePerKwhCents: null,
      totalCents: null,
    })
  })

  it('refuses to estimate without power', () => {
    expect(() =>
      calculateReload({ durationMinutes: 30 }, { powerKw: null, pricePerKwhCents: null }),
    ).toThrow(EnergyUnknownError)
  })

  it('accepts informed energy even without power', () => {
    expect(
      calculateReload(
        { durationMinutes: 30, energyKwh: 12 },
        { powerKw: null, pricePerKwhCents: null },
      ),
    ).toMatchObject({ energyKwh: 12, energyEstimated: false })
  })
})
