// @vitest-environment jsdom

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type {
  FixtureDetailRefresh,
  FixtureRefresh,
  RefreshFixtureHeadToHeadInput,
  Result
} from '@shared/contracts'
import {
  db,
  readFixtureHeadToHead,
  readFixtureIdentity,
  readFixtureQuery,
  writeFixtureDetailRefresh
} from '@/data/db'
import { currentTimeZone, todayInTimeZone } from '@/lib/date'
import {
  invalidateFixtureRefreshes,
  prefetchFixtureEntity,
  prefetchFixtureHeadToHead,
  prefetchMatchdayWindow,
  prefetchFixtureQuery,
  refreshFixtureEntity,
  useFixtureEntity
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
  it('does not let a previous fixture request replace the current loading or error state', async () => {
    const previousRequest = deferred<Result<FixtureDetailRefresh>>()
    const currentRequest = deferred<Result<FixtureDetailRefresh>>()
    const refreshFixture = vi
      .fn()
      .mockReturnValueOnce(previousRequest.promise)
      .mockReturnValueOnce(currentRequest.promise)
    installHalfspace({ refreshFixture })
    const { result, rerender } = renderHook(({ fixtureId }) => useFixtureEntity(fixtureId, true), {
      initialProps: { fixtureId: 19425456 }
    })
    await waitFor(() => expect(refreshFixture).toHaveBeenCalledTimes(1))
    rerender({ fixtureId: 19425457 })
    await waitFor(() => expect(refreshFixture).toHaveBeenCalledTimes(2))

    await act(async () => {
      previousRequest.resolve({
        ok: false,
        error: { code: 'network', message: 'Previous fixture failed.' }
      })
      await previousRequest.promise
    })
    expect(result.current.error).toBeNull()
    expect(result.current.refreshing).toBe(true)

    const current = fixtureRefresh('Current fixture', Date.now())
    current.fixture.id = 19425457
    await act(async () => {
      currentRequest.resolve({ ok: true, data: current })
      await currentRequest.promise
    })
    await waitFor(() => expect(result.current.refreshing).toBe(false))
    expect(result.current.error).toBeNull()
    await waitFor(() => expect(result.current.cached?.fixture?.name).toBe('Current fixture'))
  })

  it('never exposes the previous fixture while the next cached identity is loading', async () => {
    await writeFixtureDetailRefresh(fixtureRefresh('First fixture'))
    const nextFixture = fixtureRefresh('Second fixture')
    nextFixture.fixture.id = 19425457
    await writeFixtureDetailRefresh(nextFixture)
    const { result, rerender } = renderHook(({ fixtureId }) => useFixtureEntity(fixtureId, false), {
      initialProps: { fixtureId: 19425456 }
    })
    await waitFor(() => expect(result.current.cached?.fixture?.name).toBe('First fixture'))

    rerender({ fixtureId: 19425457 })
    expect(result.current.cached?.fixture?.name).not.toBe('First fixture')
    await waitFor(() => expect(result.current.cached?.fixture?.name).toBe('Second fixture'))
  })

  it('prefetches a missing matchday query without refetching fresh data', async () => {
    const date = todayInTimeZone(currentTimeZone())
    const refreshFixtures = vi.fn().mockResolvedValue({ ok: true, data: fixtureListRefresh() })
    installHalfspace({ refreshFixtures })

    await prefetchFixtureQuery(date, currentTimeZone())
    await prefetchFixtureQuery(date, currentTimeZone())

    expect(refreshFixtures).toHaveBeenCalledTimes(1)
    expect((await readFixtureQuery(date, currentTimeZone())).fixtures).toHaveLength(1)
  })

  it('prefetches the rolling matchday window once and hydrates each date', async () => {
    const refresh = fixtureListRefresh()
    refresh.fixtures[0].starting_at_timestamp = Date.UTC(2026, 7, 28, 18) / 1_000
    const refreshFixtureWindow = vi.fn().mockResolvedValue({
      ok: true,
      data: refresh
    })
    installHalfspace({ refreshFixtureWindow })

    await prefetchMatchdayWindow('2026-08-28', currentTimeZone())
    await prefetchMatchdayWindow('2026-08-28', currentTimeZone())

    expect(refreshFixtureWindow).toHaveBeenCalledTimes(1)
    expect(refreshFixtureWindow).toHaveBeenCalledWith({
      startDate: '2026-08-24',
      endDate: '2026-09-04',
      timeZone: currentTimeZone()
    })
    expect((await readFixtureQuery('2026-08-24', currentTimeZone())).query).not.toBeNull()
    expect((await readFixtureQuery('2026-08-28', currentTimeZone())).fixtures).toHaveLength(1)
    expect((await readFixtureQuery('2026-08-29', currentTimeZone())).query).not.toBeNull()
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
      refreshSubscription: vi.fn(),
      refreshStatisticSeasons: vi.fn(),
      refreshSeasonBracket: vi.fn(),
      refreshPredictedLineups: vi.fn(),
      refreshNews: vi.fn(),
      refreshMatchFacts: vi.fn(),
      refreshHonours: vi.fn(),
      refreshTeamOfWeek: vi.fn(),
      refreshFixtureTv: vi.fn(),
      refreshFixturePressure: vi.fn(),
      refreshFixtures: vi.fn(),
      refreshFixtureWindow: vi.fn(),
      refreshFixture: vi.fn(),
      refreshFixtureHeadToHead: vi.fn(),
      refreshFixtureOdds: vi.fn(),
      refreshCompetitions: vi.fn(),
      refreshCompetitionSeasons: vi.fn(),
      refreshStandings: vi.fn(),
      refreshRoundStandings: vi.fn(),
      refreshTransferFeed: vi.fn(),
      refreshSeasonStatistics: vi.fn(),
      refreshSeasonTopscorers: vi.fn(),
      refreshCompetitionFixtures: vi.fn(),
      refreshTeam: vi.fn(),
      refreshTeamFixtures: vi.fn(),
      refreshTeamSquad: vi.fn(),
      refreshTeamStatistics: vi.fn(),
      refreshTeamTransfers: vi.fn(),
      refreshVenue: vi.fn(),
      refreshPlayer: vi.fn(),
      refreshCoach: vi.fn(),
      refreshReferee: vi.fn(),
      refreshSeasonSchedule: vi.fn(),
      refreshFixtureCommentary: vi.fn(),
      refreshTeamRivals: vi.fn(),
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
