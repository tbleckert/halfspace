import { z } from 'zod'
import type { TeamDirectoryInput, TeamDirectoryRefresh } from '@shared/team-directory'
import { fetchSeasonTeams, teamSchema } from './sportmonks'
import { requestSportmonks, SportmonksError } from './sportmonks-client'

const inputSchema = z
  .object({
    page: z.number().int().min(1).max(10000),
    query: z.string().trim().min(2).max(100).optional(),
    countryId: z.number().int().positive().optional(),
    seasonId: z.number().int().positive().optional()
  })
  .refine((input) => [input.query, input.countryId, input.seasonId].filter(Boolean).length <= 1)

export function validateTeamDirectoryInput(value: unknown): TeamDirectoryInput {
  const result = inputSchema.safeParse(value)
  if (!result.success)
    throw new SportmonksError('invalid_input', 'Choose a valid team search or filter.')
  return result.data
}

export async function fetchTeamDirectory(
  input: TeamDirectoryInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<TeamDirectoryRefresh> {
  const fetchedAt = Date.now()
  if (input.seasonId) {
    const result = await fetchSeasonTeams({ seasonId: input.seasonId }, token, fetcher)
    const start = (input.page - 1) * 50
    return {
      ...input,
      teams: result.teams.slice(start, start + 50),
      hasMore: result.teams.length > start + 50,
      fetchedAt: result.fetchedAt
    }
  }
  const path = input.query
    ? `/search/${encodeURIComponent(input.query)}`
    : input.countryId
      ? `/countries/${input.countryId}`
      : ''
  const url = new URL(`https://api.sportmonks.com/v3/football/teams${path}`)
  url.searchParams.set('include', 'country;venue')
  url.searchParams.set('per_page', '50')
  url.searchParams.set('page', String(input.page))
  const result = await requestSportmonks(
    url,
    token,
    z.object({
      data: z.array(teamSchema),
      pagination: z.object({ current_page: z.number().int(), has_more: z.boolean() })
    }),
    fetcher
  )
  if (
    result.pagination.current_page !== input.page ||
    result.data.some((team) => input.countryId !== undefined && team.country_id !== input.countryId)
  )
    throw new SportmonksError(
      'invalid_response',
      'Sportmonks returned a different team directory page.'
    )
  return { ...input, teams: result.data, hasMore: result.pagination.has_more, fetchedAt }
}
