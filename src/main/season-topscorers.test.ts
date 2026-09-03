import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSportmonksRateLimits } from './sportmonks-client'
import { makeTopscorer } from '../test/topscorer-fixtures'
import { fetchSeasonTopscorers, validateSeasonTopscorersInput } from './sportmonks'

describe('season topscorers', () => {
  beforeEach(clearSportmonksRateLimits)
  it('fetches every page with the requested categories and safe header authentication', async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const page = Number(new URL(input.toString()).searchParams.get('page'))
      return Response.json({
        data: [makeTopscorer({ id: page, type_id: page === 1 ? 208 : 84 })],
        pagination: { current_page: page, has_more: page === 1 },
        rate_limit: { remaining: 100 - page, resets_in_seconds: 120 }
      })
    })

    const result = await fetchSeasonTopscorers({ seasonId: 25591 }, 'private-token', fetcher)

    expect(result.topscorers.map(({ id }) => id)).toEqual([1, 2])
    expect(result.pageCount).toBe(2)
    expect(result.rateLimit?.remaining).toBe(98)
    for (const [input, options] of fetcher.mock.calls) {
      const url = new URL(input.toString())
      expect(url.pathname).toBe('/v3/football/topscorers/seasons/25591')
      expect(url.searchParams.get('include')).toBe('player;participant;type')
      expect(url.searchParams.get('filters')).toBe('seasonTopscorerTypes:208,209,84,83')
      expect(url.searchParams.has('api_token')).toBe(false)
      expect(options?.headers).toMatchObject({ Authorization: 'private-token' })
    }
  })

  it('accepts unavailable relationships and empty seasons', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ data: [makeTopscorer({ player: null, participant: null, type: null })] })
      )
      .mockResolvedValueOnce(Response.json({ data: [] }))
    expect(
      (await fetchSeasonTopscorers({ seasonId: 25591 }, 'token', fetcher)).topscorers
    ).toHaveLength(1)
    expect((await fetchSeasonTopscorers({ seasonId: 25590 }, 'token', fetcher)).topscorers).toEqual(
      []
    )
  })

  it('does not return a partial leaderboard when a later page fails', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ data: [makeTopscorer()], pagination: { current_page: 1, has_more: true } })
      )
      .mockResolvedValueOnce(Response.json({ message: 'Limit reached' }, { status: 429 }))
    await expect(
      fetchSeasonTopscorers({ seasonId: 25591 }, 'token', fetcher)
    ).rejects.toMatchObject({ code: 'rate_limited' })
  })

  it('rejects malformed totals at the provider boundary', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: [makeTopscorer({ total: -1 })] }))
    await expect(
      fetchSeasonTopscorers({ seasonId: 25591 }, 'token', fetcher)
    ).rejects.toMatchObject({ code: 'invalid_response' })
  })

  it('validates season IDs before requesting data', () => {
    expect(validateSeasonTopscorersInput({ seasonId: 25591 })).toEqual({ seasonId: 25591 })
    for (const seasonId of [0, -1, '25591', 1.5, null]) {
      expect(() => validateSeasonTopscorersInput({ seasonId })).toThrow('Choose a valid season.')
    }
  })
})
