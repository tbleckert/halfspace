// @vitest-environment jsdom

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FixtureRefresh, StandingsRefresh } from '@shared/contracts'
import { db, readCompetitionFixtureQuery, readStandingsQuery } from '@/data/db'
import { currentTimeZone } from '@/lib/date'
import { prefetchCompetitionWorkspace } from './use-competition-workspace'

beforeEach(async () => {
  if (!db.isOpen()) await db.open()

  await db.transaction(
    'rw',
    db.competitions,
    db.fixtures,
    db.competitionFixtureQueries,
    db.standings,
    db.standingQueries,
    async () => {
      await Promise.all([
        db.competitions.clear(),
        db.fixtures.clear(),
        db.competitionFixtureQueries.clear(),
        db.standings.clear(),
        db.standingQueries.clear()
      ])
    }
  )
})

afterAll(() => db.close())

describe('competition workspace prefetch', () => {
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
      refreshStandings: vi.fn(),
      refreshCompetitionFixtures: vi.fn(),
      refreshTeam: vi.fn(),
      refreshTeamFixtures: vi.fn(),
      refreshTeamSquad: vi.fn(),
      refreshVenue: vi.fn(),
      refreshPlayer: vi.fn(),
      refreshPlayerAppearances: vi.fn(),
      searchEntities: vi.fn(),
      ...overrides
    }
  }
}
