// @vitest-environment jsdom

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  FixtureDetailRefresh,
  FixtureRefresh,
  RefreshFixtureHeadToHeadInput,
  Result
} from '@shared/contracts'
import { db, readFixtureHeadToHead, readFixtureIdentity, readFixtureQuery } from '@/data/db'
import { currentTimeZone, todayInTimeZone } from '@/lib/date'
import {
  invalidateFixtureRefreshes,
  prefetchFixtureEntity,
  prefetchFixtureHeadToHead,
  prefetchFixtureQuery,
  refreshFixtureEntity
} from './use-fixtures'

beforeEach(async () => {
  invalidateFixtureRefreshes()
  if (!db.isOpen()) await db.open()
  await db.transaction(
    'rw',
    db.fixtures,
    db.fixtureQueries,
    db.fixtureHeadToHeadQueries,
    async () => {
      await db.fixtures.clear()
      await db.fixtureQueries.clear()
      await db.fixtureHeadToHeadQueries.clear()
    }
  )
})

afterAll(() => db.close())

describe('fixture refresh', () => {
  it('prefetches a missing matchday query without refetching fresh data', async () => {
    const date = todayInTimeZone(currentTimeZone())
    const refreshFixtures = vi.fn().mockResolvedValue({ ok: true, data: fixtureListRefresh() })
    installHalfspace({ refreshFixtures })

    await prefetchFixtureQuery(date, currentTimeZone())
    await prefetchFixtureQuery(date, currentTimeZone())

    expect(refreshFixtures).toHaveBeenCalledTimes(1)
    expect((await readFixtureQuery(date, currentTimeZone())).fixtures).toHaveLength(1)
  })

  it('prefetches missing fixture detail without refetching fresh data', async () => {
    const refreshFixture = vi.fn().mockResolvedValue({
      ok: true,
      data: fixtureRefresh('Manchester City vs Arsenal', Date.now())
    })
    installHalfspace({ refreshFixture })

    await prefetchFixtureEntity(19425456)
    await prefetchFixtureEntity(19425456)

    expect(refreshFixture).toHaveBeenCalledTimes(1)
  })

  it('does not restore an old fixture after the credential changes', async () => {
    const oldRequest = deferred<Result<FixtureDetailRefresh>>()
    const newRequest = deferred<Result<FixtureDetailRefresh>>()
    const refreshFixture = vi
      .fn()
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(newRequest.promise)

    installHalfspace({ refreshFixture })

    const oldRefresh = refreshFixtureEntity(19425456)
    invalidateFixtureRefreshes()
    const newRefresh = refreshFixtureEntity(19425456)

    newRequest.resolve({ ok: true, data: fixtureRefresh('Manchester City vs Arsenal') })
    await newRefresh

    oldRequest.resolve({ ok: true, data: fixtureRefresh('Old fixture') })
    await oldRefresh

    expect((await readFixtureIdentity(19425456)).fixture?.name).toBe('Manchester City vs Arsenal')
  })

  it('prefetches a team pair once while its previous meetings are fresh', async () => {
    const input: RefreshFixtureHeadToHeadInput = {
      firstTeamId: 11,
      secondTeamId: 22,
      timeZone: currentTimeZone()
    }
    const refreshFixtureHeadToHead = vi
      .fn()
      .mockResolvedValue({ ok: true, data: fixtureListRefresh() })
    installHalfspace({ refreshFixtureHeadToHead })

    await prefetchFixtureHeadToHead(input)
    await prefetchFixtureHeadToHead({ ...input, firstTeamId: 22, secondTeamId: 11 })

    expect(refreshFixtureHeadToHead).toHaveBeenCalledTimes(1)
    expect((await readFixtureHeadToHead(input)).fixtures).toHaveLength(1)
  })
})

function fixtureListRefresh(): FixtureRefresh {
  return {
    fetchedAt: Date.now(),
    pageCount: 1,
    timeZone: currentTimeZone(),
    fixtures: [fixtureRefresh('Manchester City vs Arsenal').fixture]
  }
}

function fixtureRefresh(name: string, fetchedAt = Date.UTC(2026, 7, 28, 10)): FixtureDetailRefresh {
  return {
    fetchedAt,
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
      refreshVenue: vi.fn(),
      refreshPlayer: vi.fn(),
      refreshPlayerAppearances: vi.fn(),
      refreshPlayerStatistics: vi.fn(),
      getRateLimit: vi.fn(),
      onRateLimitChange: vi.fn(() => vi.fn()),
      searchEntities: vi.fn(),
      ...overrides
    }
  }
}
