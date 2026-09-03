import { describe, expect, it, vi } from 'vitest'
import { fetchTeamOfWeek, validateTeamOfWeekInput } from './team-of-week'

const entry = {
  id: 1,
  player_id: 2,
  team_id: 3,
  fixture_id: 4,
  round_id: 5,
  rating: '8.2',
  formation_position: 1,
  formation: '4-4-2',
  player: null,
  team: null,
  round: {
    id: 5,
    league_id: 8,
    season_id: 20,
    name: '2',
    starting_at: '2026-08-28',
    ending_at: '2026-08-31'
  }
}

describe('Team of the Week', () => {
  it('reads the latest selection as one complete response, retaining its season and round', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data: [entry] }))
    const result = await fetchTeamOfWeek({ competitionId: 8 }, 'token', fetcher)
    expect(result.entries[0]).toMatchObject({ rating: 8.2, round: { season_id: 20, id: 5 } })
    expect(String(fetcher.mock.calls[0][0])).toContain('/team-of-the-week/leagues/8/latest?')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('loads an explicit round and rejects selections outside its requested context', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data: [entry] }))
    await fetchTeamOfWeek({ competitionId: 8, roundId: 5 }, 'token', fetcher)
    expect(String(fetcher.mock.calls[0][0])).toContain('/team-of-the-week/rounds/5?')
    await expect(
      fetchTeamOfWeek({ competitionId: 8, roundId: 6 }, 'token', fetcher)
    ).rejects.toMatchObject({ code: 'invalid_response' })
    await expect(fetchTeamOfWeek({ competitionId: 9 }, 'token', fetcher)).rejects.toMatchObject({
      code: 'invalid_response'
    })
  })

  it('rejects invalid IDs at the IPC boundary', () => {
    expect(() => validateTeamOfWeekInput({ competitionId: 8, roundId: -1 })).toThrow()
    expect(() => validateTeamOfWeekInput({ competitionId: '8' })).toThrow()
  })
})
