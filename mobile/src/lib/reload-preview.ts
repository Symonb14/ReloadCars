/**
 * Preview of the server rules (server/src/lib/reload-calculation.ts) while the driver
 * fills the form. The server recalculates everything on save.
 */
export function previewReload(input: {
  durationMinutes: number
  energyKwh?: number
  pricePerKwhCents?: number
  point: { powerKw: number | null; pricePerKwhCents: number | null }
}) {
  const estimated =
    input.point.powerKw && input.durationMinutes > 0
      ? Math.round(input.point.powerKw * (input.durationMinutes / 60) * 100) / 100
      : undefined

  const energyKwh = input.energyKwh ?? estimated
  const pricePerKwhCents = input.point.pricePerKwhCents ?? input.pricePerKwhCents
  const totalCents =
    energyKwh !== undefined && pricePerKwhCents !== undefined
      ? Math.round(energyKwh * pricePerKwhCents)
      : undefined

  return {
    energyKwh,
    energyEstimated: input.energyKwh === undefined,
    estimatedEnergyKwh: estimated,
    pricePerKwhCents,
    totalCents,
  }
}
