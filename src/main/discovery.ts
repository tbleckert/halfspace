import { z } from 'zod'
import type {
  PlayerDirectoryInput,
  PlayerDirectoryRefresh,
  CountryCompetitionsInput,
  CountryCompetitionsRefresh,
  TeamSeasonsInput,
  TeamSeasonsRefresh
} from '@shared/discovery'
import { competitionSchema, fetchCompetitionList, playerSchema, seasonSchema } from './sportmonks'
import { requestSportmonks, SportmonksError } from './sportmonks-client'

const directoryInputSchema = z
  .object({
    page: z.number().int().min(1).max(10000),
    query: z.string().trim().min(2).max(100).optional(),
    countryId: z.number().int().positive().optional()
  })
  .refine(({ query, countryId }) => !(query && countryId))

export function validatePlayerDirectoryInput(value: unknown): PlayerDirectoryInput {
  const result = directoryInputSchema.safeParse(value)
  if (!result.success)
    throw new SportmonksError('invalid_input', 'Choose a valid player search or country.')
  return result.data
}
export function validateCountryCompetitionsInput(value: unknown): CountryCompetitionsInput {
  const result = z.object({ countryId: z.number().int().positive() }).safeParse(value)
  if (!result.success) throw new SportmonksError('invalid_input', 'Choose a valid country.')
  return result.data
}
export function validateTeamSeasonsInput(value: unknown): TeamSeasonsInput {
  const result = z.object({ teamId: z.number().int().positive() }).safeParse(value)
  if (!result.success) throw new SportmonksError('invalid_input', 'Choose a valid team.')
  return result.data
}

const directoryPlayerSchema = playerSchema
  .extend({
    detailedposition: playerSchema.shape.detailedPosition
  })
  .transform(({ detailedposition, ...player }) => ({
    ...player,
    detailedPosition: player.detailedPosition ?? detailedposition
  }))

export async function fetchPlayerDirectory(
  input: PlayerDirectoryInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<PlayerDirectoryRefresh> {
  const fetchedAt = Date.now()
  const path = input.query
    ? `/search/${encodeURIComponent(input.query)}`
    : input.countryId
      ? `/countries/${input.countryId}`
      : ''
  const url = new URL(`https://api.sportmonks.com/v3/football/players${path}`)
  url.searchParams.set('include', 'country;nationality;position;detailedPosition')
  url.searchParams.set('per_page', '50')
  url.searchParams.set('page', String(input.page))
  const result = await requestSportmonks(
    url,
    token,
    z.object({
      data: z.array(directoryPlayerSchema),
      pagination: z.object({ current_page: z.number().int(), has_more: z.boolean() })
    }),
    fetcher
  )
  if (
    result.pagination.current_page !== input.page ||
    result.data.some(
      (player) =>
        (input.countryId !== undefined && player.country_id !== input.countryId) ||
        (player.country && player.country.id !== player.country_id) ||
        (player.nationality && player.nationality.id !== player.nationality_id) ||
        (player.position && player.position.id !== player.position_id) ||
        (player.detailedPosition && player.detailedPosition.id !== player.detailed_position_id)
    )
  )
    throw new SportmonksError(
      'invalid_response',
      'Sportmonks returned a different player directory page.'
    )
  return { ...input, players: result.data, hasMore: result.pagination.has_more, fetchedAt }
}

export async function fetchCountryCompetitions(
  input: CountryCompetitionsInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<CountryCompetitionsRefresh> {
  const result = await fetchCompetitionList(`/leagues/countries/${input.countryId}`, token, fetcher)
  if (
    result.competitions.some(
      (competition) =>
        competition.country_id !== input.countryId ||
        (competition.country && competition.country.id !== input.countryId) ||
        (competition.currentseason && competition.currentseason.league_id !== competition.id)
    )
  )
    throw new SportmonksError(
      'invalid_response',
      'Sportmonks returned competitions for a different country.'
    )
  return { ...input, ...result }
}

export async function fetchTeamSeasons(
  input: TeamSeasonsInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<TeamSeasonsRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`https://api.sportmonks.com/v3/football/seasons/teams/${input.teamId}`)
  url.searchParams.set('include', 'league')
  const result = await requestSportmonks(
    url,
    token,
    z.object({
      data: z.array(seasonSchema.extend({ league: competitionSchema.nullish() }))
    }),
    fetcher
  )
  if (result.data.some((season) => season.league && season.league.id !== season.league_id))
    throw new SportmonksError(
      'invalid_response',
      'Sportmonks returned mismatched season competitions.'
    )
  return {
    ...input,
    seasons: [...new Map(result.data.map((season) => [season.id, season])).values()],
    fetchedAt
  }
}
