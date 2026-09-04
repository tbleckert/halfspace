import { z } from 'zod'

export const tvStationSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  url: z.string().nullable(),
  image_path: z.string().nullable()
})

export const tvListingSchema = z.object({
  id: z.number().int(),
  fixture_id: z.number().int(),
  tvstation_id: z.number().int(),
  country_id: z.number().int().nullable(),
  tvstation: tvStationSchema.nullable(),
  country: z
    .object({
      id: z.number().int(),
      name: z.string(),
      image_path: z.string().nullable()
    })
    .nullable()
})
