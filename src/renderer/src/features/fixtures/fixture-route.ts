import { z } from 'zod'
import { isIsoDate } from '@/lib/date'

const startedStateIds = new Set([2, 3, 4, 5, 6, 7, 8, 9, 11, 15, 18, 21, 22, 25])

export function defaultFixtureView(stateId: number): 'preview' | 'game' {
  return startedStateIds.has(stateId) ? 'game' : 'preview'
}

const optionalPositiveId = z.preprocess((value) => {
  const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
}, z.number().int().positive().optional())

export const fixtureDetailSearchSchema = z.object({
  date: z.string().refine(isIsoDate).optional().catch(undefined),
  competition: optionalPositiveId,
  season: optionalPositiveId,
  team: optionalPositiveId,
  oddsFeed: z.enum(['pre-match', 'inplay']).optional().catch(undefined),
  market: optionalPositiveId,
  bookmaker: optionalPositiveId
})

export type FixtureDetailSearch = z.infer<typeof fixtureDetailSearchSchema>

export interface FixturePlayerContext {
  competition: number | undefined
  date: string | undefined
  season: number | undefined
}
