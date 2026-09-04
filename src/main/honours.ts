import { z } from 'zod'
import type { RefreshHonoursInput, HonoursRefresh } from '@shared/contracts'
import { requestSportmonks, SportmonksError } from './sportmonks-client'
const inputSchema = z.object({
  entity: z.enum(['teams', 'players', 'coaches']),
  entityId: z.number().int().positive()
})
const identitySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  image_path: z.string().nullish()
})
const responseSchema = z.object({
  data: z.object({
    id: z.number().int(),
    trophies: z.array(
      z.object({
        id: z.number().int(),
        participant_id: z.number().int(),
        team_id: z.number().int().nullable(),
        league_id: z.number().int(),
        season_id: z.number().int().nullable(),
        trophy_id: z.number().int(),
        trophy: z
          .object({ id: z.number().int(), name: z.string(), position: z.number().int() })
          .nullable(),
        league: identitySchema.nullable(),
        season: z
          .object({
            id: z.number().int(),
            league_id: z.number().int(),
            name: z.string(),
            starting_at: z.string().nullish(),
            ending_at: z.string().nullish()
          })
          .nullable(),
        team: identitySchema.nullish()
      })
    )
  })
})
export function validateHonoursInput(value: unknown): RefreshHonoursInput {
  const result = inputSchema.safeParse(value)
  if (!result.success)
    throw new SportmonksError('invalid_input', 'Select a valid team, player, or coach.')
  return result.data
}
export async function fetchHonours(
  input: RefreshHonoursInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<HonoursRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`https://api.sportmonks.com/v3/football/${input.entity}/${input.entityId}`)
  url.searchParams.set('include', 'trophies.trophy;trophies.league;trophies.season;trophies.team')
  url.searchParams.set('select', 'id')
  const { data } = await requestSportmonks(url, token, responseSchema, fetcher)
  if (
    data.id !== input.entityId ||
    data.trophies.some(
      (item) =>
        item.participant_id !== input.entityId ||
        (item.league && item.league.id !== item.league_id) ||
        (item.season &&
          (item.season.id !== item.season_id || item.season.league_id !== item.league_id)) ||
        (item.team && item.team.id !== item.team_id) ||
        (item.trophy && item.trophy.id !== item.trophy_id)
    )
  )
    throw new SportmonksError(
      'invalid_response',
      'Sportmonks returned inconsistent honour relationships.'
    )
  return { ...input, honours: data.trophies, fetchedAt }
}
