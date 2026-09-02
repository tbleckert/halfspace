// @vitest-environment jsdom

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  FixtureRefresh,
  Result,
  TeamRefresh,
  TeamSquadRefresh,
  TeamStatisticsRefresh,
  TransfersRefresh
} from '@shared/contracts'
import {
  db,
  readTeamFixtureQuery,
  readTeamIdentity,
  readTeamStatistics,
  readTeamTransfers
} from '@/data/db'
import { currentTimeZone } from '@/lib/date'
import {
  invalidateTeamRefreshes,
  prefetchTeamEntity,
  prefetchTeamFixtures,
  prefetchTeamSquad,
  prefetchTeamStatistics,
  prefetchTeamTransfers,
  refreshTeamEntity,
  teamFixtureInput
} from './use-team'

beforeEach(async () => {
  invalidateTeamRefreshes()
  if (!db.isOpen()) await db.open()
  await db.transaction(
    'rw',
    [
      db.fixtures,
      db.teams,
      db.teamFixtureQueries,
      db.squadEntries,
      db.teamSquadQueries,
      db.teamSeasonSquadQueries,
      db.teamStatisticsQueries,
      db.transfers,
      db.teamTransferQueries
    ],
    async () => {
      await db.fixtures.clear()
      await db.teams.clear()
      await db.teamFixtureQueries.clear()
      await db.squadEntries.clear()
      await db.teamSquadQueries.clear()
      await db.teamSeasonSquadQueries.clear()
      await db.teamStatisticsQueries.clear()
      await db.transfers.clear()
      await db.teamTransferQueries.clear()
    }
  )
})

afterAll(() => db.close())

describe('team refresh', () => {
  it('starts the team fixture browser on the selected date', () => {
    expect(teamFixtureInput(9, '2026-08-29', 'UTC')).toEqual({
      teamId: 9,
      startDate: '2026-08-29',
      endDate: '2026-10-28',
      timeZone: 'UTC'
    })
  })

  it('prefetches a missing team fixture window without refetching fresh data', async () => {
    const input = teamFixtureInput(9)
    const refreshTeamFixtures = vi.fn().mockResolvedValue({ ok: true, data: teamFixturesRefresh() })
    installHalfspace({ refreshTeamFixtures })

    await prefetchTeamFixtures(input)
    await prefetchTeamFixtures(input)

    expect(refreshTeamFixtures).toHaveBeenCalledTimes(1)
    expect((await readTeamFixtureQuery(input)).query).not.toBeNull()
  })

  it('prefetches missing team detail without refetching fresh data', async () => {
    const refreshTeam = vi
      .fn()
      .mockResolvedValue({ ok: true, data: teamRefresh('Manchester City', Date.now()) })
    installHalfspace({ refreshTeam })

    await prefetchTeamEntity(9)
    await prefetchTeamEntity(9)

    expect(refreshTeam).toHaveBeenCalledTimes(1)
  })

  it('prefetches a missing squad without refetching fresh data', async () => {
    const refreshTeamSquad = vi.fn().mockResolvedValue({ ok: true, data: teamSquadRefresh() })
    installHalfspace({ refreshTeamSquad })

    await prefetchTeamSquad(9)
    await prefetchTeamSquad(9)

    expect(refreshTeamSquad).toHaveBeenCalledTimes(1)
  })

  it('prefetches each squad season once without sharing in-flight requests', async () => {
    const refreshTeamSquad = vi.fn().mockResolvedValue({ ok: true, data: teamSquadRefresh() })
    installHalfspace({ refreshTeamSquad })
    await Promise.all([
      prefetchTeamSquad(9, 100),
      prefetchTeamSquad(9, 101),
      prefetchTeamSquad(9, 100)
    ])
    await prefetchTeamSquad(9, 100)
    expect(refreshTeamSquad).toHaveBeenCalledTimes(2)
    expect(refreshTeamSquad).toHaveBeenCalledWith({ teamId: 9, seasonId: 100 })
    expect(refreshTeamSquad).toHaveBeenCalledWith({ teamId: 9, seasonId: 101 })
  })

  it('prefetches missing team statistics without refetching fresh data', async () => {
    const input = { seasonId: 23614, teamId: 9 }
    const refreshTeamStatistics = vi
      .fn()
      .mockResolvedValue({ ok: true, data: teamStatisticsRefresh() })
    installHalfspace({ refreshTeamStatistics })

    await prefetchTeamStatistics(input)
    await prefetchTeamStatistics(input)

    expect(refreshTeamStatistics).toHaveBeenCalledTimes(1)
    expect(await readTeamStatistics(input)).not.toBeNull()
  })

  it('prefetches missing team transfers without refetching fresh data', async () => {
    const input = { teamId: 9 }
    const refreshTeamTransfers = vi
      .fn()
      .mockResolvedValue({ ok: true, data: teamTransfersRefresh() })
    installHalfspace({ refreshTeamTransfers })

    await prefetchTeamTransfers(input)
    await prefetchTeamTransfers(input)

    expect(refreshTeamTransfers).toHaveBeenCalledTimes(1)
    expect((await readTeamTransfers(input)).query).not.toBeNull()
  })

  it('does not restore an old team after the credential changes', async () => {
    const oldRequest = deferred<Result<TeamRefresh>>()
    const newRequest = deferred<Result<TeamRefresh>>()
    const refreshTeam = vi
      .fn()
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(newRequest.promise)

    installHalfspace({ refreshTeam })

    const oldRefresh = refreshTeamEntity(9)
    invalidateTeamRefreshes()
    const newRefresh = refreshTeamEntity(9)

    newRequest.resolve({ ok: true, data: teamRefresh('Manchester City') })
    await newRefresh

    oldRequest.resolve({ ok: true, data: teamRefresh('Old Manchester City') })
    await oldRefresh

    expect((await readTeamIdentity(9)).team?.name).toBe('Manchester City')
  })
})

function teamRefresh(name: string, fetchedAt = Date.UTC(2026, 7, 28, 10)): TeamRefresh {
  return {
    fetchedAt,
    team: {
      id: 9,
      sport_id: 1,
      country_id: 462,
      venue_id: 206,
      gender: 'male',
      name,
      founded: 1880,
      placeholder: false
    }
  }
}

function teamSquadRefresh(): TeamSquadRefresh {
  return {
    fetchedAt: Date.now(),
    squad: []
  }
}

function teamFixturesRefresh(): FixtureRefresh {
  return {
    fetchedAt: Date.now(),
    pageCount: 1,
    timeZone: currentTimeZone(),
    fixtures: []
  }
}

function teamStatisticsRefresh(): TeamStatisticsRefresh {
  return {
    fetchedAt: Date.now(),
    statistics: []
  }
}

function teamTransfersRefresh(): TransfersRefresh {
  return {
    fetchedAt: Date.now(),
    pageCount: 1,
    transfers: []
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
