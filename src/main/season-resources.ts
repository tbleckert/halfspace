import { z } from 'zod'
import type { RefreshStandingsInput } from '@shared/contracts'
import type {
  SeasonRefereesRefresh,
  SeasonVenuesRefresh,
  StandingCorrectionsRefresh
} from '@shared/season-resources'
import { refereeBaseSchema, teamSchema, venueSchema } from './sportmonks'
import { requestSportmonks, SportmonksError } from './sportmonks-client'

const refereesResponse = z.object({
  data: z.array(refereeBaseSchema),
  pagination: z.object({ current_page: z.number().int().positive(), has_more: z.boolean() })
})
const contextSchema = z.object({ id: z.number().int(), name: z.string() }).nullish()
const correctionsResponse = z.object({
  data: z.array(
    z.object({
      id: z.number().int(),
      season_id: z.number().int(),
      stage_id: z.number().int().nullable(),
      group_id: z.number().int().nullable(),
      type_id: z.number().int(),
      participant_type: z.string(),
      participant_id: z.number().int(),
      value: z.number(),
      calc_type: z.string().nullable(),
      active: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean),
      participant: teamSchema.nullish(),
      stage: contextSchema,
      group: contextSchema
    })
  )
})

export async function fetchSeasonReferees(
  input: RefreshStandingsInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<SeasonRefereesRefresh> {
  const fetchedAt = Date.now()
  const referees: SeasonRefereesRefresh['referees'] = []
  for (let page = 1; page <= 200; page++) {
    const url = new URL(`https://api.sportmonks.com/v3/football/referees/seasons/${input.seasonId}`)
    url.searchParams.set('include', 'country')
    url.searchParams.set('per_page', '50')
    url.searchParams.set('page', String(page))
    const result = await requestSportmonks(url, token, refereesResponse, fetcher)
    if (result.pagination.current_page !== page)
      throw new SportmonksError('invalid_response', 'Sportmonks returned a different referee page.')
    referees.push(...result.data)
    if (!result.pagination.has_more)
      return {
        ...input,
        referees: [...new Map(referees.map((referee) => [referee.id, referee])).values()],
        fetchedAt
      }
  }
  throw new SportmonksError('invalid_response', 'Sportmonks returned too many referee pages.')
}

export async function fetchSeasonVenues(
  input: RefreshStandingsInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<SeasonVenuesRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`https://api.sportmonks.com/v3/football/venues/seasons/${input.seasonId}`)
  url.searchParams.set('include', 'country')
  const { data } = await requestSportmonks(
    url,
    token,
    z.object({ data: z.array(venueSchema) }),
    fetcher
  )
  return { ...input, venues: data, fetchedAt }
}

export async function fetchStandingCorrections(
  input: RefreshStandingsInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<StandingCorrectionsRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(
    `https://api.sportmonks.com/v3/football/standings/corrections/seasons/${input.seasonId}`
  )
  url.searchParams.set('include', 'participant;stage;group')
  const { data } = await requestSportmonks(url, token, correctionsResponse, fetcher)
  if (
    data.some(
      (row) =>
        row.season_id !== input.seasonId ||
        (row.participant &&
          (row.participant_type !== 'team' || row.participant.id !== row.participant_id)) ||
        (row.stage && row.stage.id !== row.stage_id) ||
        (row.group && row.group.id !== row.group_id)
    )
  ) {
    throw new SportmonksError(
      'invalid_response',
      'Sportmonks returned inconsistent standings adjustments.'
    )
  }
  return { ...input, corrections: data, fetchedAt }
}
