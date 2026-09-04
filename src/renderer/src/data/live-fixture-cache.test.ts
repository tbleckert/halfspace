import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type { FixtureRefresh, SportmonksFixture } from '@shared/contracts'
import { db, readFixtureIdentity, readLiveFixtureQuery, writeLiveFixtureRefresh } from './db'

beforeEach(async () => {
  if (!db.isOpen()) await db.open()
  await db.transaction('rw', db.fixtures, db.liveFixtureQueries, async () => {
    await db.fixtures.clear()
    await db.liveFixtureQueries.clear()
  })
})

afterAll(() => db.close())

describe('live fixture cache', () => {
  it('stores one complete, thirty-second livescore snapshot', async () => {
    const fetchedAt = Date.UTC(2026, 8, 4, 12)
    await writeLiveFixtureRefresh(refresh([fixture(1, 2)], fetchedAt))

    const cached = await readLiveFixtureQuery()

    expect(cached.query).toMatchObject({
      key: 'inplay',
      fixtureIds: [1],
      fetchedAt,
      staleAt: fetchedAt + 30_000
    })
    expect(cached.fixtures[0].raw.scores[0].score.goals).toBe(1)
  })

  it('keeps a newer snapshot and clears only live membership when play ends', async () => {
    const fetchedAt = Date.UTC(2026, 8, 4, 12)
    await writeLiveFixtureRefresh(refresh([fixture(1, 2)], fetchedAt))
    await writeLiveFixtureRefresh(refresh([], fetchedAt - 1))

    expect((await readLiveFixtureQuery()).fixtures).toHaveLength(1)

    await writeLiveFixtureRefresh(refresh([], fetchedAt + 30_000))

    expect((await readLiveFixtureQuery()).fixtures).toHaveLength(0)
    expect((await readFixtureIdentity(1)).fixture?.id).toBe(1)
  })
})

function refresh(fixtures: SportmonksFixture[], fetchedAt: number): FixtureRefresh {
  return {
    fixtures,
    fetchedAt,
    pageCount: 1,
    timeZone: 'Europe/Stockholm'
  }
}

function fixture(id: number, stateId: number): SportmonksFixture {
  return {
    id,
    league_id: 8,
    season_id: 12,
    state_id: stateId,
    placeholder: false,
    has_odds: false,
    participants: [
      { id: 11, name: 'Home team', meta: { location: 'home' } },
      { id: 22, name: 'Away team', meta: { location: 'away' } }
    ],
    scores: [
      {
        id: 1,
        participant_id: 11,
        description: 'CURRENT',
        score: { goals: 1, participant: 'home' }
      }
    ]
  }
}
