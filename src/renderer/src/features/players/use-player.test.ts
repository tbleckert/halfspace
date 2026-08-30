// @vitest-environment jsdom

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlayerRefresh, Result } from '@shared/contracts'
import { db, readPlayerIdentity } from '@/data/db'
import { invalidatePlayerRefreshes, prefetchPlayerEntity, refreshPlayerEntity } from './use-player'

beforeEach(async () => {
  invalidatePlayerRefreshes()
  if (!db.isOpen()) await db.open()
  await db.players.clear()
})

afterAll(() => db.close())

describe('player refresh', () => {
  it('prefetches missing player detail without refetching fresh data', async () => {
    const refreshPlayer = vi
      .fn()
      .mockResolvedValue({ ok: true, data: playerRefresh('Quinten Timber', Date.now()) })
    installHalfspace({ refreshPlayer })

    await prefetchPlayerEntity(6306068)
    await prefetchPlayerEntity(6306068)

    expect(refreshPlayer).toHaveBeenCalledTimes(1)
  })

  it('does not restore an old player after the credential changes', async () => {
    const oldRequest = deferred<Result<PlayerRefresh>>()
    const newRequest = deferred<Result<PlayerRefresh>>()
    const refreshPlayer = vi
      .fn()
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(newRequest.promise)

    installHalfspace({ refreshPlayer })

    const oldRefresh = refreshPlayerEntity(6306068)
    invalidatePlayerRefreshes()
    const newRefresh = refreshPlayerEntity(6306068)

    newRequest.resolve({ ok: true, data: playerRefresh('Quinten Timber') })
    await newRefresh

    oldRequest.resolve({ ok: true, data: playerRefresh('Old Quinten Timber') })
    await oldRefresh

    expect((await readPlayerIdentity(6306068)).player?.displayName).toBe('Quinten Timber')
  })
})

function playerRefresh(displayName: string, fetchedAt = Date.UTC(2026, 7, 28, 10)): PlayerRefresh {
  return {
    fetchedAt,
    player: {
      id: 6306068,
      sport_id: 1,
      country_id: 38,
      nationality_id: 38,
      city_id: 93391,
      position_id: 26,
      detailed_position_id: 153,
      type_id: 26,
      name: 'Quinten Maduro',
      display_name: displayName,
      height: 177,
      weight: null,
      date_of_birth: '2001-06-17',
      gender: 'male'
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

function installHalfspace(overrides: Partial<Window['halfspace']['sportmonks']>): void {
  window.halfspace = {
    credentials: {
      getConnectionState: vi.fn(),
      saveToken: vi.fn(),
      clearToken: vi.fn()
    },
    sportmonks: {
      refreshFixtures: vi.fn(),
      refreshFixture: vi.fn(),
      refreshFixtureOdds: vi.fn(),
      refreshCompetitions: vi.fn(),
      refreshCompetitionSeasons: vi.fn(),
      refreshStandings: vi.fn(),
      refreshSeasonStatistics: vi.fn(),
      refreshCompetitionFixtures: vi.fn(),
      refreshTeam: vi.fn(),
      refreshTeamFixtures: vi.fn(),
      refreshTeamSquad: vi.fn(),
      refreshTeamStatistics: vi.fn(),
      refreshVenue: vi.fn(),
      refreshPlayer: vi.fn(),
      refreshPlayerAppearances: vi.fn(),
      getRateLimit: vi.fn(),
      onRateLimitChange: vi.fn(() => vi.fn()),
      searchEntities: vi.fn(),
      ...overrides
    }
  }
}
