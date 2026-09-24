import { z } from 'zod'

export const latitude = z.coerce.number().min(-90).max(90)
export const longitude = z.coerce.number().min(-180).max(180)

export const coordinatesSchema = z.object({ latitude: z.number(), longitude: z.number() })
