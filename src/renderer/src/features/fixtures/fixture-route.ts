import { z } from 'zod'
import { isIsoDate } from '@/lib/date'

const optionalPositiveId = z.preprocess((value) => {
  const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
}, z.number().int().positive().optional())

export const fixtureDetailSearchSchema = z.object({
  date: z.string().refine(isIsoDate).optional().catch(undefined),
  competition: optionalPositiveId,
  season: optionalPositiveId,
  team: optionalPositiveId
})

export type FixtureDetailSearch = z.infer<typeof fixtureDetailSearchSchema>
