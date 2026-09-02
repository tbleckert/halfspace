// @vitest-environment jsdom

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Result, VenueRefresh } from '@shared/contracts'
import { db, readVenueIdentity } from '@/data/db'
import { invalidateVenueRefreshes, prefetchVenueEntity, refreshVenueEntity } from './use-venue'

beforeEach(async () => {
  invalidateVenueRefreshes()
  if (!db.isOpen()) await db.open()
  await db.venues.clear()
})

afterAll(() => db.close())

describe('venue refresh', () => {
  it('prefetches missing venue detail without refetching fresh data', async () => {
    const refreshVenue = vi
      .fn()
      .mockResolvedValue({ ok: true, data: venueRefresh('Etihad Stadium', Date.now()) })
    installHalfspace({ refreshVenue })

    await prefetchVenueEntity(206)
    await prefetchVenueEntity(206)

    expect(refreshVenue).toHaveBeenCalledTimes(1)
  })

  it('does not restore an old venue after the credential changes', async () => {
    const oldRequest = deferred<Result<VenueRefresh>>()
    const newRequest = deferred<Result<VenueRefresh>>()
    const refreshVenue = vi
      .fn()
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(newRequest.promise)

    installHalfspace({ refreshVenue })

    const oldRefresh = refreshVenueEntity(206)
    invalidateVenueRefreshes()
    const newRefresh = refreshVenueEntity(206)

    newRequest.resolve({ ok: true, data: venueRefresh('Etihad Stadium') })
    await newRefresh

    oldRequest.resolve({ ok: true, data: venueRefresh('Old Etihad Stadium') })
    await oldRefresh

    expect((await readVenueIdentity(206)).venue?.name).toBe('Etihad Stadium')
  })
})

function venueRefresh(name: string, fetchedAt = Date.UTC(2026, 7, 28, 10)): VenueRefresh {
  return {
    fetchedAt,
    venue: {
      id: 206,
      country_id: 462,
      name,
      capacity: 55097
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
      refreshFixtureWindow: vi.fn(),
      refreshFixture: vi.fn(),
      refreshFixtureHeadToHead: vi.fn(),
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
      refreshTeamTransfers: vi.fn(),
      refreshVenue: vi.fn(),
      refreshPlayer: vi.fn(),
      refreshCoach: vi.fn(),
      refreshPlayerAppearances: vi.fn(),
      refreshPlayerStatistics: vi.fn(),
      refreshPlayerTransfers: vi.fn(),
      getRateLimit: vi.fn(),
      onRateLimitChange: vi.fn(() => vi.fn()),
      searchEntities: vi.fn(),
      ...overrides
    }
  }
}
