import { describe, expect, it, vi } from 'vitest'
import { fetchCompetitionById, fetchSeasonTeams, fetchTeamCompetitions } from './sportmonks'

const competition = { id: 8, country_id: 462, name: 'Premier League', active: true }
const team = {
  id: 1,
  sport_id: 1,
  country_id: 462,
  venue_id: null,
  gender: 'male',
  name: 'Club',
  founded: null,
  placeholder: false
}

describe('entity discovery', () => {
  it('loads a competition directly and normalizes its current season', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: {
          ...competition,
          currentSeason: { id: 10, league_id: 8, name: '2026/27', is_current: true }
        }
      })
    )
    const result = await fetchCompetitionById({ competitionId: 8 }, 'token', fetcher)
    expect(result.competition.currentseason?.id).toBe(10)
    const url = new URL(String(fetcher.mock.calls[0][0]))
    expect(url.pathname).toBe('/v3/football/leagues/8')
    expect(url.searchParams.get('include')).toBe('country;currentSeason')
    expect(url.searchParams.has('page')).toBe(false)
  })

  it('rejects a competition response with a different identity', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data: competition }))
    await expect(fetchCompetitionById({ competitionId: 9 }, 'token', fetcher)).rejects.toThrow(
      /match/
    )
  })

  it.each(['competitions', 'teams'] as const)('fetches every page of %s', async (entity) => {
    const record = entity === 'competitions' ? competition : team
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ data: [record], pagination: { current_page: 1, has_more: true } })
      )
      .mockResolvedValueOnce(
        Response.json({
          data: [{ ...record, id: 99 }],
          pagination: { current_page: 2, has_more: false }
        })
      )
    const result =
      entity === 'competitions'
        ? await fetchTeamCompetitions({ teamId: 1 }, 'token', fetcher)
        : await fetchSeasonTeams({ seasonId: 10 }, 'token', fetcher)
    expect(result.pageCount).toBe(2)
    expect('teams' in result ? result.teams : result.competitions).toHaveLength(2)
    const urls = fetcher.mock.calls.map(([url]) => new URL(String(url)))
    expect(urls[0].pathname).toBe(
      entity === 'teams' ? '/v3/football/teams/seasons/10' : '/v3/football/leagues/teams/1/current'
    )
    expect(urls.map((url) => url.searchParams.get('page'))).toEqual(['1', '2'])
  })

  it.each(['competitions', 'teams'] as const)('never returns a partial %s list', async (entity) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          data: [entity === 'teams' ? team : competition],
          pagination: { current_page: 1, has_more: true }
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          data: [{ id: 'invalid' }],
          pagination: { current_page: 2, has_more: false }
        })
      )
    await expect(
      entity === 'teams'
        ? fetchSeasonTeams({ seasonId: 10 }, 'token', fetcher)
        : fetchTeamCompetitions({ teamId: 1 }, 'token', fetcher)
    ).rejects.toThrow()
  })
})
