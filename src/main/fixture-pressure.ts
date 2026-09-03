import { z } from 'zod'
import type { FixturePressureRefresh, RefreshFixtureInput } from '@shared/contracts'
import { requestSportmonks, SportmonksError } from './sportmonks-client'

const responseSchema = z.object({
  data: z.object({
    id: z.number().int(),
    pressure: z.array(
      z.object({
        id: z.number().int(),
        fixture_id: z.number().int(),
        participant_id: z.number().int(),
        minute: z.number().int().nonnegative(),
        pressure: z.number().nonnegative()
      })
    )
  })
})

export async function fetchFixturePressure(
  input: RefreshFixtureInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<FixturePressureRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`https://api.sportmonks.com/v3/football/fixtures/${input.fixtureId}`)
  url.searchParams.set('include', 'pressure')
  url.searchParams.set('select', 'id')
  const { data } = await requestSportmonks(url, token, responseSchema, fetcher)
  if (
    data.id !== input.fixtureId ||
    data.pressure.some((point) => point.fixture_id !== input.fixtureId)
  ) {
    throw new SportmonksError(
      'invalid_response',
      'Sportmonks returned pressure for another fixture.'
    )
  }
  return { points: data.pressure, fetchedAt }
}
