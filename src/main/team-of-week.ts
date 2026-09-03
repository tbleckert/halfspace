import { z } from 'zod'
import type { RefreshTeamOfWeekInput, TeamOfWeekRefresh } from '@shared/contracts'
import { playerSchema, teamSchema } from './sportmonks'
import { requestSportmonks, SportmonksError } from './sportmonks-client'

const inputSchema = z.object({
  competitionId: z.number().int().positive(),
  roundId: z.number().int().positive().optional()
})

const responseSchema = z.object({
  data: z.array(
    z.object({
      id: z.number().int(),
      player_id: z.number().int(),
      team_id: z.number().int(),
      fixture_id: z.number().int(),
      round_id: z.number().int(),
      rating: z
        .union([z.number(), z.string().trim().min(1)])
        .transform(Number)
        .pipe(z.number().min(0).max(10))
        .nullable(),
      formation_position: z.number().int().positive().nullable(),
      formation: z.string().nullable(),
      player: playerSchema.nullable(),
      team: teamSchema.nullable(),
      round: z.object({
        id: z.number().int(),
        league_id: z.number().int(),
        season_id: z.number().int(),
        name: z.string(),
        starting_at: z.string().nullable().optional(),
        ending_at: z.string().nullable().optional()
      })
    })
  )
})

export function validateTeamOfWeekInput(input: unknown): RefreshTeamOfWeekInput {
  const result = inputSchema.safeParse(input)
  if (!result.success)
    throw new SportmonksError('invalid_input', 'Select a valid competition and round.')
  return result.data
}

export async function fetchTeamOfWeek(
  input: RefreshTeamOfWeekInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<TeamOfWeekRefresh> {
  const fetchedAt = Date.now()
  const path = input.roundId ? `rounds/${input.roundId}` : `leagues/${input.competitionId}/latest`
  const url = new URL(`https://api.sportmonks.com/v3/football/team-of-the-week/${path}`)
  url.searchParams.set('include', 'player;team;round')
  const { data } = await requestSportmonks(url, token, responseSchema, fetcher)
  if (
    data.some(
      (entry) =>
        entry.round.league_id !== input.competitionId ||
        entry.round.id !== entry.round_id ||
        (input.roundId && entry.round_id !== input.roundId)
    )
  ) {
    throw new SportmonksError(
      'invalid_response',
      'Sportmonks returned a selection for another competition or round.'
    )
  }
  return { entries: data, fetchedAt }
}
