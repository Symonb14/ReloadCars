const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** "11222333000181" → "11.222.333/0001-81" (also alphanumeric CNPJs). */
export function formatCnpj(value: string) {
  if (value.length !== 14) return value
  return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12)}`
}

/** "31999990000" → "(31) 99999-0000" */
export function formatPhone(digits: string) {
  const match = digits.match(/^(\d{2})(\d{4,5})(\d{4})$/)
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : digits
}

/** 180 → "R$ 1,80/kWh" */
export function formatPricePerKwh(cents: number) {
  return `${currency.format(cents / 100)}/kWh`
}

/** 22 → "22 kW" */
export function formatPower(kw: number) {
  return `${decimal.format(kw)} kW`
}

/** Brazilian decimal input: "1,80" → 1.8; "" → undefined; invalid → NaN. */
export function parseDecimal(text: string): number | undefined {
  const normalized = text.trim().replace(/\s/g, '').replace(',', '.')
  if (!normalized) return undefined
  const value = Number(normalized)
  return Number.isFinite(value) ? value : Number.NaN
}

/** 1.8 → "1,80"; used to fill decimal inputs. */
export function toDecimalInput(value: number | null | undefined, digits = 2) {
  if (value == null) return ''
  return value.toFixed(digits).replace('.', ',')
}

/** "Posto ABC" → "PA", "Mercado Edméia Lazzarotti" → "ML"; used in avatars. */
export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words
  return letters.map((word) => word?.[0]?.toUpperCase() ?? '').join('') || '?'
}

const energyFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** 3960 → "R$ 39,60" */
export function formatMoney(cents: number) {
  return currency.format(cents / 100)
}

/** 47.5 → "47,5 kWh" */
export function formatEnergy(kwh: number) {
  return `${energyFormat.format(kwh)} kWh`
}

/**
 * Phone mask while typing: "3199454147" → "(31) 9945-4147",
 * "31999454147" → "(31) 99945-4147".
 */
export function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  const ddd = digits.slice(0, 2)
  const rest = digits.slice(2)
  // Landlines have 8 digits after the area code, mobiles 9.
  const split = rest.length > 8 ? 5 : 4
  return rest.length > split
    ? `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`
    : `(${ddd}) ${rest}`
}

/**
 * CNPJ mask while typing, numeric or alphanumeric (2026):
 * "12abc34501de35" → "12.ABC.345/01DE-35". The last 2 characters are digits only.
 */
export function maskCnpj(value: string) {
  const chars = value.toUpperCase().replace(/[^0-9A-Z]/g, '')
  const base = chars.slice(0, 12)
  const checkDigits = chars.slice(12).replace(/\D/g, '').slice(0, 2)
  const cnpj = base + checkDigits

  const parts = [
    cnpj.slice(0, 2),
    cnpj.slice(2, 5),
    cnpj.slice(5, 8),
    cnpj.slice(8, 12),
    cnpj.slice(12, 14),
  ]
  let masked = parts[0] ?? ''
  if (parts[1]) masked += `.${parts[1]}`
  if (parts[2]) masked += `.${parts[2]}`
  if (parts[3]) masked += `/${parts[3]}`
  if (parts[4]) masked += `-${parts[4]}`
  return masked
}
