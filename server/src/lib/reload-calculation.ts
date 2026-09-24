/**
 * Energy and price rules of a registered charge (specs/06-recargas.md).
 * The server always recomputes these values; the app only shows a preview.
 */

export type ReloadInput = {
  durationMinutes: number
  /** kWh shown by the charger, when the driver informs it. */
  energyKwh?: number
  /** Price informed by the driver, used only when the point has none. */
  pricePerKwhCents?: number
}

export type ChargePointPricing = {
  powerKw: number | null
  pricePerKwhCents: number | null
}

export type ReloadCalculation = {
  energyKwh: number
  energyEstimated: boolean
  pricePerKwhCents: number | null
  totalCents: number | null
}

export class EnergyUnknownError extends Error {
  constructor() {
    super('Energy was not informed and the charge point has no power registered')
  }
}

export function calculateReload(
  input: ReloadInput,
  point: ChargePointPricing,
): ReloadCalculation {
  const energyEstimated = input.energyKwh === undefined
  const rawEnergy = energyEstimated
    ? estimateEnergy(point.powerKw, input.durationMinutes)
    : input.energyKwh

  if (rawEnergy === undefined) throw new EnergyUnknownError()
  const energyKwh = roundTo2(rawEnergy)

  // A price registered for the point (partners) wins over the informed one.
  const pricePerKwhCents = point.pricePerKwhCents ?? input.pricePerKwhCents ?? null
  const totalCents =
    pricePerKwhCents === null ? null : Math.round(energyKwh * pricePerKwhCents)

  return { energyKwh, energyEstimated, pricePerKwhCents, totalCents }
}

function estimateEnergy(powerKw: number | null, durationMinutes: number) {
  if (powerKw === null || powerKw <= 0) return undefined
  return powerKw * (durationMinutes / 60)
}

function roundTo2(value: number) {
  return Math.round(value * 100) / 100
}
