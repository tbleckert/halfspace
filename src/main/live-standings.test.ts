import { expect, it, vi } from 'vitest'
import { fetchLiveStandings, validateLiveStandingsInput } from './sportmonks'

const standing = {
  id: 1,
  participant_id: 19,
  league_id: 8,
  season_id: 12,
  stage_id: 1,
  group_id: null,
  round_id: 4,
  standing_rule_id: null,
  position: 1,
  result: 'up',
  points: 3
}

it('fetches the live league table with the displayed standing details', async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ data: [standing] }))
  const result = await fetchLiveStandings({ competitionId: 8, seasonId: 12 }, 'token', fetcher)
  const url = new URL(String(fetcher.mock.calls[0][0]))
  expect(url.pathname).toBe('/v3/football/standings/live/leagues/8')
  expect(url.searchParams.get('filters')).toBe('standingDetailTypes:129,179')
  expect(result.standings).toEqual([standing])
})

it('rejects a live table belonging to another league or season', async () => {
  for (const input of [
    { competitionId: 9, seasonId: 12 },
    { competitionId: 8, seasonId: 13 }
  ]) {
    await expect(
      fetchLiveStandings(input, 'token', async () => Response.json({ data: [standing] }))
    ).rejects.toMatchObject({ code: 'invalid_response' })
  }
  expect(() => validateLiveStandingsInput({ competitionId: 8 })).toThrow()
})

it('accepts an empty live table when there is no active stage', async () => {
  expect(
    (
      await fetchLiveStandings({ competitionId: 8, seasonId: 12 }, 'token', async () =>
        Response.json({ data: [] })
      )
    ).standings
  ).toEqual([])
})
