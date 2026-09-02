// @vitest-environment jsdom

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FixtureRefresh, SeasonStatisticsRefresh, StandingsRefresh } from '@shared/contracts'
import {
  db,
  readCompetitionFixtureQuery,
  readSeasonStatistics,
  readStandingsQuery
} from '@/data/db'
import { currentTimeZone } from '@/lib/date'
import {
  competitionWorkspaceFixtureInput,
  invalidateCompetitionWorkspaceRefreshes,
  prefetchSeasonStatistics,
  prefetchCompetitionWorkspace
} from './use-competition-workspace'

beforeEach(async () => {
  invalidateCompetitionWorkspaceRefreshes()
  if (!db.isOpen()) await db.open()

  await db.transaction(
    'rw',
    [
      db.competitions,
      db.fixtures,
      db.competitionFixtureQueries,
      db.standings,
      db.standingQueries,
      db.seasonStatisticsQueries
    ],
    async () => {
      await Promise.all([
        db.competitions.clear(),
        db.fixtures.clear(),
        db.competitionFixtureQueries.clear(),
        db.standings.clear(),
        db.standingQueries.clear(),
        db.seasonStatisticsQueries.clear()
      ])
    }
  )
})

afterAll(() => db.close())

describe('competition workspace prefetch', () => {
  it('centers fixture browsing on the selected date', () => {
    expect(competitionWorkspaceFixtureInput(271, '2026-08-29', 'UTC')).toEqual({
      competitionId: 271,
      startDate: '2026-08-15',
      endDate: '2026-09-12',
      timeZone: 'UTC'
    })
  })

  it('warms missing fixtures and standings without refetching fresh data', async () => {
    const refreshCompetitionFixtures = vi
      .fn()
      .mockResolvedValue({ ok: true, data: fixtureRefresh() })
    const refreshStandings = vi.fn().mockResolvedValue({ ok: true, data: standingsRefresh() })
    installHalfspace({ refreshCompetitionFixtures, refreshStandings })
    await db.competitions.put({
      id: 271,
      countryId: 752,
      name: 'Allsvenskan',
      active: true,
      imagePath: null,
      currentSeasonId: 25591,
      currentSeasonName: '2026',
      raw: {
        id: 271,
        country_id: 752,
        name: 'Allsvenskan',
        active: true,
        currentseason: {
          id: 25591,
          league_id: 271,
          name: '2026',
          is_current: true
        }
      },
      fetchedAt: Date.now()
    })

    await prefetchCompetitionWorkspace(271)
    await prefetchCompetitionWorkspace(271)

    expect(refreshCompetitionFixtures).toHaveBeenCalledTimes(1)
    expect(refreshStandings).toHaveBeenCalledTimes(1)
    expect(
      (await readCompetitionFixtureQuery(refreshCompetitionFixtures.mock.calls[0][0])).query
    ).not.toBeNull()
    expect((await readStandingsQuery(25591)).query).not.toBeNull()
  })

  it('prefetches missing season statistics without refetching fresh data', async () => {
    const refreshSeasonStatistics = vi
      .fn()
      .mockResolvedValue({ ok: true, data: seasonStatisticsRefresh() })
    installHalfspace({ refreshSeasonStatistics })

    await prefetchSeasonStatistics(25591)
    await prefetchSeasonStatistics(25591)

    expect(refreshSeasonStatistics).toHaveBeenCalledTimes(1)
    expect(await readSeasonStatistics(25591)).not.toBeNull()
  })
})

function fixtureRefresh(): FixtureRefresh {
  return {
    fetchedAt: Date.now(),
    pageCount: 1,
    timeZone: currentTimeZone(),
    fixtures: []
  }
}

function standingsRefresh(): StandingsRefresh {
  return {
    fetchedAt: Date.now(),
    standings: []
  }
}

function seasonStatisticsRefresh(): SeasonStatisticsRefresh {
  return {
    fetchedAt: Date.now(),
    statistics: []
  }
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
