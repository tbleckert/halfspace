// @vitest-environment jsdom

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CompetitionRefresh, Result } from '@shared/contracts'
import { db, readCompetitionCatalog } from '@/data/db'
import { invalidateCompetitionRefresh, refreshCompetitionCatalog } from './use-competitions'

beforeEach(async () => {
  invalidateCompetitionRefresh()
  if (!db.isOpen()) await db.open()

  await db.transaction('rw', db.competitions, db.competitionCatalogs, async () => {
    await db.competitions.clear()
    await db.competitionCatalogs.clear()
  })
})

afterAll(() => db.close())

describe('competition refresh', () => {
  it('does not restore an old catalogue after the credential changes', async () => {
    const oldRequest = deferred<Result<CompetitionRefresh>>()
    const newRequest = deferred<Result<CompetitionRefresh>>()
    const refreshCompetitions = vi
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
        refreshFixture: vi.fn(),
        refreshFixtureOdds: vi.fn(),
        refreshCompetitions,
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
        searchEntities: vi.fn()
      }
    }

    const oldRefresh = refreshCompetitionCatalog()
    invalidateCompetitionRefresh()
    const newRefresh = refreshCompetitionCatalog()

    newRequest.resolve({ ok: true, data: competitionRefresh(8, 'Premier League') })
    await newRefresh

    oldRequest.resolve({ ok: true, data: competitionRefresh(564, 'La Liga') })
    await oldRefresh

    const cached = await readCompetitionCatalog()
    expect(cached.competitions.map(({ id }) => id)).toEqual([8])
  })
})

function competitionRefresh(id: number, name: string): CompetitionRefresh {
  return {
    fetchedAt: Date.UTC(2026, 7, 28, 10),
    pageCount: 1,
    competitions: [
      {
        id,
        country_id: 1,
        name,
        active: true
      }
    ]
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
