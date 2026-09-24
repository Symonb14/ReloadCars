const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** 850 → "850 m", 7011 → "7 km", 12500 → "12,5 km" */
export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`
  return `${decimal.format(meters / 1000)} km`
}

/** 905 → "15 min", 5400 → "1 h 30 min" */
export function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

/** 180 → "R$ 1,80/kWh" */
export function formatPricePerKwh(cents: number) {
  return `${currency.format(cents / 100)}/kWh`
}

/** 7.4 → "7,4 kW" */
export function formatPower(kw: number) {
  return `${decimal.format(kw)} kW`
}
