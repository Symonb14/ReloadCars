/**
 * Connector labels shown in the apps. The admin panel picks from this list and the
 * Open Charge Map import normalizes to it (see open-charge-map.ts).
 */
export const connectorTypes = [
  'CCS2',
  'Tipo 2 (cabo)',
  'Tipo 2 (tomada)',
  'CHAdeMO',
  'GB/T AC',
  'GB/T DC',
  'Tipo 1',
  'CCS1',
  'Tesla',
] as const

export type ConnectorType = (typeof connectorTypes)[number]
