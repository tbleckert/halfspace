import { describe, expect, it, vi } from 'vitest'
import { fetchRefereeById, validateRefereeInput } from './sportmonks'

describe('referee provider boundary', () => {
  it('validates the ID before requesting data', () => {
    expect(validateRefereeInput({ refereeId: 14468 })).toEqual({ refereeId: 14468 })
    expect(() => validateRefereeInput({ refereeId: -1 })).toThrow('Choose a valid referee.')
  })

  it('fetches identity and nested fixture appointments without exposing the token in the URL', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: {
          id: 14468,
          name: 'John Beaton',
          display_name: 'J. Beaton',
          country_id: 1161,
          country: { id: 1161, name: 'Scotland' },
          latest: [
            {
              id: 1,
              referee_id: 14468,
              fixture_id: 50,
              type_id: 6,
              type: { id: 6, name: 'Referee' },
              fixture: {
                id: 50,
                league_id: 501,
                season_id: 1,
                state_id: 5,
                placeholder: false,
                has_odds: false,
                participants: [],
                scores: []
              }
            }
          ]
        }
      })
    )
    const result = await fetchRefereeById({ refereeId: 14468 }, 'private-token', fetcher)
    const [input, init] = fetcher.mock.calls[0]
    const url = new URL(input.toString())
    expect(url.pathname).toBe('/v3/football/referees/14468')
    expect(url.searchParams.get('include')).toContain('latest.fixture.participants')
    expect(url.searchParams.get('include')).toContain('statistics.details')
    expect(url.searchParams.get('include')).toContain('statistics.season.league')
    expect(url.searchParams.get('filters')).toBe(
      'refereeStatisticDetailTypes:47,56,83,84,85,188,314'
    )
    expect(url.searchParams.has('api_token')).toBe(false)
    expect(new Headers(init?.headers).get('Authorization')).toBe('private-token')
    expect(result.referee.latest?.[0].fixture?.id).toBe(50)
  })
})
