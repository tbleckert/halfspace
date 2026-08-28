// @vitest-environment jsdom

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FixtureDetailRefresh, Result } from '@shared/contracts'
import { db, readFixtureIdentity } from '@/data/db'
import { invalidateFixtureRefreshes, refreshFixtureEntity } from './use-fixtures'

beforeEach(async () => {
  invalidateFixtureRefreshes()
  if (!db.isOpen()) await db.open()
  await db.fixtures.clear()
})

afterAll(() => db.close())

describe('fixture refresh', () => {
  it('does not restore an old fixture after the credential changes', async () => {
    const oldRequest = deferred<Result<FixtureDetailRefresh>>()
    const newRequest = deferred<Result<FixtureDetailRefresh>>()
    const refreshFixture = vi
      .fn()
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(newRequest.promise)

    window.halfspace = {
      credentials: {
        getConnectionState: vi.fn(),
        saveToken: vi.fn(),
        clearToken: vi.fn()
      },
      sportmonks: {
        refreshFixtures: vi.fn(),
        refreshFixture,
        refreshFixtureOdds: vi.fn(),
        refreshCompetitions: vi.fn(),
        refreshStandings: vi.fn(),
        refreshCompetitionFixtures: vi.fn(),
        refreshTeam: vi.fn(),
        refreshTeamFixtures: vi.fn(),
        refreshTeamSquad: vi.fn(),
        refreshVenue: vi.fn(),
        refreshPlayer: vi.fn(),
        refreshPlayerAppearances: vi.fn()
      }
    }

    const oldRefresh = refreshFixtureEntity(19425456)
    invalidateFixtureRefreshes()
    const newRefresh = refreshFixtureEntity(19425456)

    newRequest.resolve({ ok: true, data: fixtureRefresh('Manchester City vs Arsenal') })
    await newRefresh

    oldRequest.resolve({ ok: true, data: fixtureRefresh('Old fixture') })
    await oldRefresh

    expect((await readFixtureIdentity(19425456)).fixture?.name).toBe('Manchester City vs Arsenal')
  })
})

function fixtureRefresh(name: string): FixtureDetailRefresh {
  return {
    fetchedAt: Date.UTC(2026, 7, 28, 10),
    fixture: {
      id: 19425456,
      league_id: 8,
      season_id: 23614,
      state_id: 1,
      name,
      starting_at_timestamp: 1_787_848_400,
      placeholder: false,
      has_odds: false,
      participants: [],
      scores: []
    }
  }
}

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })

  return { promise, resolve }
}
