const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const energy = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const longDate = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

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

/** Time spent charging, as in the MVP: 180 → "3:00", 45 → "0:45" */
export function formatChargeTime(minutes: number) {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`
}

/** 180 → "R$ 1,80/kWh" */
export function formatPricePerKwh(cents: number) {
  return `${formatMoney(cents)}/kWh`
}

/** 3000 → "R$ 30,00" */
export function formatMoney(cents: number) {
  return currency.format(cents / 100)
}

/** 6.17 → "6,17 kWh" */
export function formatEnergy(kwh: number) {
  return `${energy.format(kwh)} kWh`
}

/** 7.4 → "7,4 kW" */
export function formatPower(kw: number) {
  return `${decimal.format(kw)} kW`
}

/** "18 de novembro de 2024 às 14:30" */
export function formatDateTime(value: string | Date) {
  const date = new Date(value)
  return `${longDate.format(date)} às ${time.format(date)}`
}

/** Parses numbers typed with a Brazilian keyboard: "1,80" → 1.8; "" → undefined. */
export function parseDecimal(text: string): number | undefined {
  const normalized = text.trim().replace(/\s/g, '').replace(',', '.')
  if (!normalized) return undefined
  const value = Number(normalized)
  return Number.isFinite(value) ? value : Number.NaN
}
