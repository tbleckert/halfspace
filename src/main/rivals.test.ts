import { describe, expect, it, vi } from 'vitest'
import { fetchTeamRivals } from './sportmonks'

describe('team rivals', () => {
  it('fetches both related clubs in a single non-paginated request', async () => {
    const team = {
      id: 1,
      sport_id: 1,
      country_id: null,
      name: 'Club',
      venue_id: null,
      gender: 'male',
      founded: null,
      placeholder: false
    }
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: [{ team_id: 1, rival_id: 2, team, rival: { ...team, id: 2, name: 'Rival' } }]
      })
    )
    const result = await fetchTeamRivals({ teamId: 1 }, 'private-token', fetcher)
    const [input, init] = fetcher.mock.calls[0]
    const url = new URL(input.toString())
    expect(url.pathname).toBe('/v3/football/rivals/teams/1')
    expect(url.searchParams.get('include')).toBe('team;rival')
    expect(url.searchParams.has('page')).toBe(false)
    expect(new Headers(init?.headers).get('Authorization')).toBe('private-token')
    expect(result.rivals[0].rival?.name).toBe('Rival')
  })
})
