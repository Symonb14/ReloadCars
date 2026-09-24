/**
 * CNPJ validation, numeric and alphanumeric (issued since July 2026): 12 characters
 * [0-9A-Z] + 2 numeric check digits. Each character is worth its ASCII code minus 48
 * (so digits keep their value and A = 17 … Z = 42), then the usual modulo 11.
 */

/** Removes punctuation and uppercases: "12.abc.345/01de-35" → "12ABC34501DE35". */
export function normalizeCnpj(value: string) {
  return value.replace(/[.\-/\s]/g, '').toUpperCase()
}

export function isValidCnpj(value: string) {
  const cnpj = normalizeCnpj(value)
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj)) return false
  if (/^(.)\1+$/.test(cnpj)) return false

  const first = checkDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = checkDigit(
    cnpj.slice(0, 12) + first,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  )

  return cnpj.endsWith(`${first}${second}`)
}

/** "12ABC34501DE35" → "12.ABC.345/01DE-35" */
export function formatCnpj(value: string) {
  const cnpj = normalizeCnpj(value)
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
}

function checkDigit(base: string, weights: number[]) {
  const sum = [...base].reduce(
    (total, char, index) => total + (char.charCodeAt(0) - 48) * (weights[index] ?? 0),
    0,
  )
  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}
