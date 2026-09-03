import { describe, expect, it, vi } from 'vitest'
import { fetchFixtureOdds, validateFixtureOddsInput } from './sportmonks'

describe('standard odds feeds', () => {
  it('fetches in-play prices once and retains suspension and provider freshness', async () => {
    const odd = {
      id: 1,
      fixture_id: 10,
      market_id: 1,
      bookmaker_id: 2,
      label: '1',
      value: '1.8',
      suspended: true,
      stopped: false,
      latest_bookmaker_update: '2026-09-03 18:30:00',
      participants: '3'
    }
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data: [odd] }))
    expect(
      (await fetchFixtureOdds({ fixtureId: 10, feed: 'inplay' }, 'token', fetcher)).odds
    ).toEqual([odd])
    expect(String(fetcher.mock.calls[0][0])).toContain('/odds/inplay/fixtures/10?')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('does not allow arbitrary feed paths', () => {
    expect(validateFixtureOddsInput({ fixtureId: 10, feed: 'pre-match' })).toEqual({
      fixtureId: 10,
      feed: 'pre-match'
    })
    expect(() => validateFixtureOddsInput({ fixtureId: 10, feed: '../premium' })).toThrow()
  })
})
