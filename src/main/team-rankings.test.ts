import { expect, it, vi } from 'vitest'
import { fetchTeamById } from './sportmonks'

it('fetches team rankings through the supported team include', async () => {
  const ranking = { id: 37, participant_id: 19, position: 16, points: 79000, type: 'UEFA' }
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({
      data: {
        id: 19,
        sport_id: 1,
        gender: 'male',
        placeholder: false,
        name: 'Arsenal',
        short_code: 'ARS',
        country_id: 462,
        venue_id: 1,
        founded: 1886,
        type: 'domestic',
        rankings: [ranking]
      }
    })
  )
  const result = await fetchTeamById({ teamId: 19 }, 'private-token', fetcher)
  const url = new URL(fetcher.mock.calls[0][0].toString())
  expect(url.pathname).toBe('/v3/football/teams/19')
  expect(url.searchParams.get('include')?.split(';')).toContain('rankings')
  expect(result.team.rankings).toEqual([ranking])
})
