import { z } from 'zod'
import type { RefreshFixtureWindowInput, TvGuideRefresh } from '@shared/contracts'
import { fixtureSchema } from './sportmonks'
import { tvListingSchema } from './tv-schema'
import { requestSportmonks, SportmonksError } from './sportmonks-client'

const responseSchema = z.object({
  data: z.array(fixtureSchema.extend({ tvstations: z.array(tvListingSchema) })),
  pagination: z.object({ current_page: z.number().int(), has_more: z.boolean() })
})

export async function fetchTvGuide(
  input: RefreshFixtureWindowInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<TvGuideRefresh> {
  const result: TvGuideRefresh = { ...input, fixtures: [], listings: [], fetchedAt: Date.now() }
  for (let page = 1; page <= 100; page++) {
    const url = new URL(
      `https://api.sportmonks.com/v3/football/fixtures/between/${input.startDate}/${input.endDate}`
    )
    url.searchParams.set(
      'include',
      'participants;league;state;scores;periods;tvStations.tvStation;tvStations.country'
    )
    url.searchParams.set('timezone', input.timeZone)
    url.searchParams.set('per_page', '50')
    url.searchParams.set('page', String(page))
    const response = await requestSportmonks(url, token, responseSchema, fetcher)
    if (
      response.pagination.current_page !== page ||
      response.data.some((fixture) =>
        fixture.tvstations.some((listing) => listing.fixture_id !== fixture.id)
      )
    ) {
      throw new SportmonksError(
        'invalid_response',
        'Sportmonks returned a different TV guide page.'
      )
    }
    for (const { tvstations, ...fixture } of response.data) {
      result.fixtures.push(fixture)
      result.listings.push(...tvstations)
    }
    if (!response.pagination.has_more) return result
  }
  throw new SportmonksError('invalid_response', 'Sportmonks returned too many TV guide pages.')
}
