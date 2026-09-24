import { describe, expect, it } from 'vitest'
import {
  formatAddress,
  normalizeConnector,
  type OcmPoi,
  toChargePoint,
} from '../src/lib/open-charge-map.ts'

describe('normalizeConnector', () => {
  it.each([
    ['CCS (Type 2)', 'CCS2'],
    ['Type 2 (Tethered Connector) ', 'Tipo 2 (cabo)'],
    ['Type 2 (Socket Only)', 'Tipo 2 (tomada)'],
    ['CHAdeMO', 'CHAdeMO'],
    ['Type 1 (J1772)', 'Tipo 1'],
    ['GB-T DC - GB/T 20234.3', 'GB/T DC'],
    ['Unknown', null],
    ['Something New', 'Something New'],
  ])('%s → %s', (title, expected) => {
    expect(normalizeConnector(title)).toBe(expected)
  })
})

describe('formatAddress', () => {
  it('drops empty and repeated parts', () => {
    expect(
      formatAddress('Av. Olegário Maciel, 683, ', 'Belo Horizonte', 'Minas Gerais'),
    ).toBe('Av. Olegário Maciel, 683, Belo Horizonte, Minas Gerais')
    expect(formatAddress('Rua X, 10, Betim', 'betim', undefined)).toBe('Rua X, 10, Betim')
  })

  it('returns null when there is nothing', () => {
    expect(formatAddress(undefined, ' ', '')).toBeNull()
  })
})

describe('toChargePoint', () => {
  const poi: OcmPoi = {
    ID: 123,
    UsageCost: 'R$ 2,00/kWh ',
    DataProvider: { Title: 'Easy Volt' },
    StatusType: { IsOperational: true },
    AddressInfo: {
      Title: ' Shopping Cidade ',
      AddressLine1: 'Rua dos Goitacazes, 326,',
      Town: 'Belo Horizonte',
      Latitude: -19.92,
      Longitude: -43.94,
    },
    Connections: [
      { PowerKW: 150, ConnectionType: { Title: 'CCS (Type 2)' } },
      { PowerKW: 22, ConnectionType: { Title: 'Type 2 (Socket Only)' } },
      { ConnectionType: { Title: 'CCS (Type 2)' } },
      { ConnectionType: { Title: 'Unknown' } },
    ],
  }

  it('maps a POI to a public charge point', () => {
    expect(toChargePoint(poi)).toEqual({
      source: 'ocm',
      externalId: '123',
      name: 'Shopping Cidade',
      description: 'Custo informado: R$ 2,00/kWh.',
      address: 'Rua dos Goitacazes, 326, Belo Horizonte',
      location: { latitude: -19.92, longitude: -43.94 },
      powerKw: 150,
      pricePerKwhCents: null,
      connectors: ['CCS2', 'Tipo 2 (tomada)'],
      openingHours: null,
      attribution: 'Dados: Open Charge Map (CC BY 4.0), fonte original: Easy Volt',
      active: true,
    })
  })

  it('marks non-operational points as inactive', () => {
    expect(toChargePoint({ ...poi, StatusType: { IsOperational: false } })?.active).toBe(
      false,
    )
  })

  it('skips POIs without coordinates', () => {
    expect(toChargePoint({ ID: 1, AddressInfo: { Title: 'Sem local' } })).toBeNull()
  })
})
