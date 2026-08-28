import { describe, expect, it, vi } from 'vitest'
import type { SportmonksFixture } from '@shared/contracts'
import { fetchFixturesByDate, validateRefreshInput, validateToken } from './sportmonks'

describe('Sportmonks client', () => {
  it('paginates with a header token and returns one combined refresh', async () => {
    const fixture = makeFixture()
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(input.toString())
      const page = Number(url.searchParams.get('page'))

      return Response.json({
        data: page === 1 ? [fixture] : [{ ...fixture, id: 2 }],
        pagination: {
          current_page: page,
          has_more: page === 1
        },
        rate_limit: {
          remaining: 2_998,
          resets_in_seconds: 3_600
        },
        timezone: 'Europe/Stockholm'
      })
    })

    const refresh = await fetchFixturesByDate(
      { date: '2026-08-27', timeZone: 'Europe/Stockholm' },
      'private-token',
      fetcher
    )

    expect(refresh.fixtures).toHaveLength(2)
    expect(refresh.pageCount).toBe(2)
    expect(fetcher).toHaveBeenCalledTimes(2)

    const [firstInput, firstInit] = fetcher.mock.calls[0]
    const firstUrl = new URL(firstInput.toString())
    expect(firstUrl.searchParams.has('api_token')).toBe(false)
    expect(new Headers(firstInit?.headers).get('Authorization')).toBe('private-token')
  })

  it('maps authentication failures without leaking the token', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 401 }))

    await expect(
      fetchFixturesByDate(
        { date: '2026-08-27', timeZone: 'Europe/Stockholm' },
        'private-token',
        fetcher
      )
    ).rejects.toMatchObject({
      code: 'unauthorized',
      message: 'Sportmonks rejected this token.'
    })
  })

  it('validates dates, time zones, and tokens at the main-process boundary', () => {
    expect(() => validateRefreshInput({ date: '2026-02-30', timeZone: 'UTC' })).toThrow(
      'Choose a valid date.'
    )
    expect(() => validateRefreshInput({ date: '2026-08-27', timeZone: 'Not/AZone' })).toThrow(
      'The selected time zone is not valid.'
    )
    expect(() => validateToken('token with spaces')).toThrow('Enter a valid Sportmonks token.')
  })
})

function makeFixture(): SportmonksFixture {
  return {
    id: 1,
    league_id: 8,
    season_id: 23614,
    state_id: 1,
    name: 'Away vs Home',
    starting_at_timestamp: 1_787_848_400,
    placeholder: false,
    has_odds: true,
    participants: [
      { id: 20, name: 'Away', meta: { location: 'away' } },
      { id: 10, name: 'Home', meta: { location: 'home' } }
    ],
    scores: []
  }
}
