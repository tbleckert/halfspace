import { describe, expect, it, vi } from 'vitest'
import { fetchFixtureCommentary } from './sportmonks'

describe('fixture commentary', () => {
  it('fetches one unpaginated payload with player identities and normalizes flags', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: [
          {
            id: 1,
            fixture_id: 50,
            comment: 'First Half starts.',
            minute: null,
            extra_minute: null,
            is_goal: 0,
            is_important: 1,
            order: 1
          }
        ]
      })
    )
    const result = await fetchFixtureCommentary({ fixtureId: 50 }, 'private-token', fetcher)
    const [input, init] = fetcher.mock.calls[0]
    const url = new URL(input.toString())
    expect(url.pathname).toBe('/v3/football/commentaries/fixtures/50')
    expect(url.searchParams.get('include')).toBe('player;relatedPlayer')
    expect(url.searchParams.has('page')).toBe(false)
    expect(new Headers(init?.headers).get('Authorization')).toBe('private-token')
    expect(result.commentaries[0]).toMatchObject({
      minute: null,
      is_goal: false,
      is_important: true
    })
  })
})
