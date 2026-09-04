import { describe, expect, it } from 'vitest'
import type { CachedFixture } from '@/data/db'
import { liveTickerFixtures } from './live-fixture-ticker-data'

describe('live fixture ticker', () => {
  it('excludes nearby scheduled and completed records returned by the livescore feed', () => {
    const fixtures = [fixture(1, 1), fixture(2, 2), fixture(3, 3), fixture(4, 5), fixture(5, 22)]

    expect(liveTickerFixtures(fixtures).map(({ id }) => id)).toEqual([2, 3, 5])
  })
})

function fixture(id: number, stateId: number): CachedFixture {
  return {
    id,
    leagueId: 8,
    seasonId: 12,
    stateId,
    startingAt: Date.now(),
    name: `Fixture ${id}`,
    resultInfo: null,
    placeholder: false,
    hasOdds: false,
    homeTeamId: null,
    awayTeamId: null,
    raw: {
      id,
      league_id: 8,
      season_id: 12,
      state_id: stateId,
      placeholder: false,
      has_odds: false,
      participants: [],
      scores: []
    },
    fetchedAt: 0,
    staleAt: 0
  }
}
