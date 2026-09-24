/**
 * Example partners and charge points around Betim/MG (fictitious data) so the app
 * has something to show before the admin panel exists. Safe to run repeatedly.
 *
 *   npm run db:seed
 */
import { sql } from 'drizzle-orm'
import { db } from './client.ts'
import { chargePoint, partner } from './schema/index.ts'

const EXAMPLE = 'Ponto de exemplo (dados fictícios).'

const partners = [
  { id: 'seed-partner-posto-abc', name: 'Posto ABC' },
  { id: 'seed-partner-mercado-edmeia', name: 'Mercado Edméia' },
  { id: 'seed-partner-estacionamento-brasilia', name: 'Estacionamento Jardim Brasília' },
  { id: 'seed-partner-shopping-cachoeira', name: 'Shopping Cachoeira' },
]

const chargePoints: (typeof chargePoint.$inferInsert)[] = [
  {
    id: 'seed-cp-posto-abc',
    source: 'partner',
    partnerId: 'seed-partner-posto-abc',
    name: 'Posto ABC',
    description: EXAMPLE,
    address: 'Av. Governador Valadares, Centro, Betim - MG',
    location: { latitude: -19.96873, longitude: -44.19791 },
    powerKw: 22,
    pricePerKwhCents: 180,
    connectors: ['Tipo 2'],
    openingHours: '24 horas',
  },
  {
    id: 'seed-cp-mercado-edmeia',
    source: 'partner',
    partnerId: 'seed-partner-mercado-edmeia',
    name: 'Mercado Edméia',
    description: EXAMPLE,
    address: 'Av. Edméia Mattos Lazzarotti, Betim - MG',
    location: { latitude: -19.9585, longitude: -44.205 },
    powerKw: 7.4,
    pricePerKwhCents: 120,
    connectors: ['Tipo 2'],
    openingHours: 'Seg. a sáb., 7h às 22h',
  },
  {
    id: 'seed-cp-estacionamento-brasilia',
    source: 'partner',
    partnerId: 'seed-partner-estacionamento-brasilia',
    name: 'Estacionamento Jardim Brasília',
    description: `${EXAMPLE} Carregador rápido (DC).`,
    address: 'Rua Bernardo Francisco Xavier, Jardim Brasília, Betim - MG',
    location: { latitude: -19.95452, longitude: -44.18431 },
    powerKw: 50,
    pricePerKwhCents: 250,
    connectors: ['CCS2'],
    openingHours: '6h às 23h',
  },
  {
    id: 'seed-cp-shopping-cachoeira',
    source: 'partner',
    partnerId: 'seed-partner-shopping-cachoeira',
    name: 'Shopping Cachoeira',
    description: EXAMPLE,
    address: 'Av. Amazonas, Cachoeira, Betim - MG',
    location: { latitude: -19.96608, longitude: -44.21693 },
    powerKw: 22,
    pricePerKwhCents: 199,
    connectors: ['Tipo 2', 'CCS2'],
    openingHours: '10h às 22h',
  },
]

await db
  .insert(partner)
  .values(partners)
  .onConflictDoUpdate({ target: partner.id, set: { name: sql`excluded.name` } })

for (const point of chargePoints) {
  const { id: _, ...fields } = point
  await db.insert(chargePoint).values(point).onConflictDoUpdate({
    target: chargePoint.id,
    set: fields,
  })
}

console.log(
  `Seed: ${partners.length} parceiros e ${chargePoints.length} pontos de exemplo.`,
)
process.exit(0)
