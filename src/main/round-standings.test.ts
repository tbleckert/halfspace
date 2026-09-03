import { expect, it, vi } from 'vitest'
import { fetchStandingsByRound, validateRoundStandingsInput } from './sportmonks'

it('validates both the round and its season', () => {
  expect(validateRoundStandingsInput({ seasonId: 12, roundId: 4 })).toEqual({
    seasonId: 12,
    roundId: 4
  })
  for (const input of [
    { seasonId: 12 },
    { seasonId: 12, roundId: 0 },
    { seasonId: '12', roundId: 4 }
  ]) {
    expect(() => validateRoundStandingsInput(input)).toThrow()
  }
})

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
  result: 'equal',
  points: 3
}

it('fetches a complete round table with only the displayed detail types', async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ data: [standing] }))
  const result = await fetchStandingsByRound({ seasonId: 12, roundId: 4 }, 'private-token', fetcher)
  const url = new URL(fetcher.mock.calls[0][0].toString())
  expect(url.pathname).toBe('/v3/football/standings/rounds/4')
  expect(url.searchParams.get('include')).toBe('participant;stage;group;details;form;rule.type')
  expect(url.searchParams.get('filters')).toBe('standingDetailTypes:129,179')
  expect(url.searchParams.has('page')).toBe(false)
  expect(result.standings).toEqual([standing])
})

it('rejects standings from a different season or round', async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ data: [standing] }))
  await expect(
    fetchStandingsByRound({ seasonId: 13, roundId: 4 }, 'token', fetcher)
  ).rejects.toThrow('selected round')
  await expect(
    fetchStandingsByRound({ seasonId: 12, roundId: 5 }, 'token', fetcher)
  ).rejects.toThrow('selected round')
})
