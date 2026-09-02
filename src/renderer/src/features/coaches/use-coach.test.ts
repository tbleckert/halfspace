// @vitest-environment jsdom

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CoachRefresh, Result } from '@shared/contracts'
import { db, readCoachIdentity } from '@/data/db'
import { invalidateCoachRefreshes, prefetchCoachEntity, refreshCoachEntity } from './use-coach'

beforeEach(async () => {
  invalidateCoachRefreshes()
  if (!db.isOpen()) await db.open()
  await db.coaches.clear()
})

afterAll(() => db.close())

describe('coach refresh', () => {
  it('prefetches missing coach detail without refetching fresh data', async () => {
    const refreshCoach = vi.fn().mockResolvedValue({ ok: true, data: coachRefresh() })
    installHalfspace({ refreshCoach })

    await prefetchCoachEntity(7)
    await prefetchCoachEntity(7)

    expect(refreshCoach).toHaveBeenCalledTimes(1)
    expect((await readCoachIdentity(7)).coach?.displayName).toBe('Pep Guardiola')
  })

  it('does not restore an old coach after the credential changes', async () => {
    const oldRequest = deferred<Result<CoachRefresh>>()
    const newRequest = deferred<Result<CoachRefresh>>()
    const refreshCoach = vi
      .fn()
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(newRequest.promise)
    installHalfspace({ refreshCoach })

    const oldRefresh = refreshCoachEntity(7)
    invalidateCoachRefreshes()
    const newRefresh = refreshCoachEntity(7)

    newRequest.resolve({ ok: true, data: coachRefresh('Pep Guardiola') })
    await newRefresh
    oldRequest.resolve({ ok: true, data: coachRefresh('Old Coach') })
    await oldRefresh

    expect((await readCoachIdentity(7)).coach?.displayName).toBe('Pep Guardiola')
  })
})

function coachRefresh(displayName = 'Pep Guardiola'): CoachRefresh {
  return {
    fetchedAt: Date.now(),
    coach: {
      id: 7,
      player_id: null,
      sport_id: 1,
      country_id: 462,
      nationality_id: 462,
      city_id: null,
      name: displayName,
      display_name: displayName,
      height: 180,
      weight: null,
      date_of_birth: '1971-01-18',
      gender: 'male'
    }
  }
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
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
      onRateLimitChange: vi.fn(),
      searchEntities: vi.fn(),
      ...overrides
    }
  }
}
