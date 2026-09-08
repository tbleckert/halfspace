// @vitest-environment jsdom
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import { clearSportmonksCache, db } from '@/data/db'
import { prefetchPlayerDirectory, invalidatePlayerDirectoryRefreshes } from './use-player-directory'
import {
  prefetchCountryCompetitions,
  invalidateCountryCompetitionsRefreshes
} from '@/features/competitions/use-country-competitions'
import {
  prefetchTeamSeasons,
  invalidateTeamSeasonsRefreshes
} from '@/features/teams/use-team-seasons'

beforeEach(async () => {
  invalidatePlayerDirectoryRefreshes()
  invalidateCountryCompetitionsRefreshes()
  invalidateTeamSeasonsRefreshes()
  await clearSportmonksCache()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.close())

it.each(['players', 'competitions', 'seasons'] as const)(
  'deduplicates %s and drops old credential responses',
  async (kind) => {
    let resolve!: (value: unknown) => void
    const pending = new Promise((done) => {
      resolve = done
    })
    const request = vi.fn().mockReturnValue(pending)
    vi.stubGlobal('halfspace', {
      sportmonks: {
        refreshPlayerDirectory: request,
        refreshCountryCompetitions: request,
        refreshTeamSeasons: request
      }
    })
    const prefetch = (): Promise<void> =>
      kind === 'players'
        ? prefetchPlayerDirectory({ page: 1 })
        : kind === 'competitions'
          ? prefetchCountryCompetitions({ countryId: 47 })
          : prefetchTeamSeasons({ teamId: 19 })
    const requests = [prefetch(), prefetch()]
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    invalidatePlayerDirectoryRefreshes()
    invalidateCountryCompetitionsRefreshes()
    invalidateTeamSeasonsRefreshes()
    resolve({
      ok: true,
      data: {
        page: 1,
        countryId: 47,
        teamId: 19,
        players: [],
        competitions: [],
        seasons: [],
        hasMore: false,
        pageCount: 1,
        fetchedAt: Date.now()
      }
    })
    await Promise.all(requests)
    expect(request).toHaveBeenCalledTimes(1)
    expect(await db.playerDirectoryQueries.count()).toBe(0)
    expect(await db.countryCompetitionQueries.count()).toBe(0)
    expect(await db.teamSeasonsQueries.count()).toBe(0)
  }
)
