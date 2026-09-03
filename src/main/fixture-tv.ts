import { z } from 'zod'
import type { FixtureTvRefresh, RefreshFixtureInput } from '@shared/contracts'
import { requestSportmonks, SportmonksError } from './sportmonks-client'

const responseSchema = z.object({
  data: z.object({
    id: z.number().int(),
    tvstations: z.array(
      z.object({
        id: z.number().int(),
        fixture_id: z.number().int(),
        tvstation_id: z.number().int(),
        country_id: z.number().int().nullable(),
        tvstation: z
          .object({
            id: z.number().int(),
            name: z.string(),
            url: z.string().nullable(),
            image_path: z.string().nullable()
          })
          .nullable(),
        country: z
          .object({
            id: z.number().int(),
            name: z.string(),
            image_path: z.string().nullable()
          })
          .nullable()
      })
    )
  })
})

export async function fetchFixtureTv(
  input: RefreshFixtureInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<FixtureTvRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`https://api.sportmonks.com/v3/football/fixtures/${input.fixtureId}`)
  url.searchParams.set('include', 'tvStations.tvStation;tvStations.country')
  url.searchParams.set('select', 'id')
  const { data } = await requestSportmonks(url, token, responseSchema, fetcher)
  if (
    data.id !== input.fixtureId ||
    data.tvstations.some((listing) => listing.fixture_id !== input.fixtureId)
  ) {
    throw new SportmonksError(
      'invalid_response',
      'Sportmonks returned TV listings for another fixture.'
    )
  }
  return { listings: data.tvstations, fetchedAt }
}
