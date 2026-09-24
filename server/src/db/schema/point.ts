import { customType } from 'drizzle-orm/pg-core'

export type Point = { longitude: number; latitude: number }

/**
 * PostGIS `geometry(Point, 4326)`.
 *
 * Drizzle's built-in `geometry()` writes points without an SRID, which a 4326 column
 * rejects, so this type writes EWKT and reads the EWKB hex PostGIS returns.
 */
export const point = customType<{ data: Point; driverData: string }>({
  dataType: () => 'geometry(Point, 4326)',
  toDriver: ({ longitude, latitude }) => `SRID=4326;POINT(${longitude} ${latitude})`,
  fromDriver: (value) => parseEwkbPoint(value),
})

function parseEwkbPoint(hex: string): Point {
  const bytes = Buffer.from(hex, 'hex')
  const littleEndian = bytes.readUInt8(0) === 1
  const readUInt32 = (offset: number) =>
    littleEndian ? bytes.readUInt32LE(offset) : bytes.readUInt32BE(offset)
  const readDouble = (offset: number) =>
    littleEndian ? bytes.readDoubleLE(offset) : bytes.readDoubleBE(offset)

  const HAS_SRID = 0x20000000
  const type = readUInt32(1)
  const coordinatesOffset = type & HAS_SRID ? 9 : 5

  return {
    longitude: readDouble(coordinatesOffset),
    latitude: readDouble(coordinatesOffset + 8),
  }
}
