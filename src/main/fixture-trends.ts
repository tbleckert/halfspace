import { z } from 'zod'
import type { FixtureTrendsRefresh, RefreshFixtureInput } from '@shared/contracts'
import { matchTrendMetrics } from '@shared/match-trends'
import { periodSchema } from './sportmonks'
import { requestSportmonks, SportmonksError } from './sportmonks-client'

const responseSchema = z.object({
  data: z.object({
    id: z.number().int(),
    trends: z.array(
      z.object({
        id: z.number().int(),
        fixture_id: z.number().int(),
        participant_id: z.number().int(),
        type_id: z.number().int(),
        period_id: z.number().int().nullable(),
        minute: z.number().int().nonnegative(),
        value: z.number().nonnegative().nullable()
      })
    ),
    periods: z.array(periodSchema)
  })
})

export async function fetchFixtureTrends(
  input: RefreshFixtureInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<FixtureTrendsRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`https://api.sportmonks.com/v3/football/fixtures/${input.fixtureId}`)
  url.searchParams.set('include', 'trends;periods')
  url.searchParams.set('select', 'id')
  url.searchParams.set('filters', `trendTypes:${matchTrendMetrics.map(({ id }) => id).join(',')}`)
  const { data } = await requestSportmonks(url, token, responseSchema, fetcher)
  if (
    data.id !== input.fixtureId ||
    [...data.trends, ...data.periods].some((row) => row.fixture_id !== input.fixtureId)
  ) {
    throw new SportmonksError('invalid_response', 'Sportmonks returned trends for another fixture.')
  }
  return { fixtureId: input.fixtureId, points: data.trends, periods: data.periods, fetchedAt }
}
