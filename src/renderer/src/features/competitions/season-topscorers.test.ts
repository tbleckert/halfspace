// @vitest-environment jsdom

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  readSeasonTopscorers,
  writePlayerRefresh,
  writeSeasonTopscorersRefresh
} from '@/data/db'
import { makeTopscorer } from '../../../../test/topscorer-fixtures'
import {
  invalidateCompetitionWorkspaceRefreshes,
  prefetchSeasonTopscorers
} from './use-competition-workspace'
import type { SeasonTopscorersRefresh } from '@shared/contracts'

beforeEach(async () => {
  invalidateCompetitionWorkspaceRefreshes()
  await clearSportmonksCache()
})
afterAll(() => db.close())

function refresh(): SeasonTopscorersRefresh {
  return { topscorers: [makeTopscorer()], fetchedAt: Date.now(), pageCount: 1 }
}

function installRequest(
  request: Window['halfspace']['sportmonks']['refreshSeasonTopscorers']
): void {
  vi.stubGlobal('halfspace', { sportmonks: { refreshSeasonTopscorers: request } })
}

describe('season leaderboard cache', () => {
  it('keeps seasons separate, caches empty results, and hydrates linked entities without losing player detail', async () => {
    const player = makeTopscorer().player!
    await writePlayerRefresh({
      player: { ...player, nationality: { id: 752, name: 'Sweden' } },
      fetchedAt: Date.now()
    })
    await writeSeasonTopscorersRefresh(25591, refresh())
    await writeSeasonTopscorersRefresh(25590, { ...refresh(), topscorers: [] })

    expect((await readSeasonTopscorers(25591))?.topscorers).toHaveLength(1)
    expect((await readSeasonTopscorers(25590))?.topscorers).toEqual([])
    expect(await readSeasonTopscorers(123)).toBeNull()
    expect((await db.players.get(player.id))?.raw.nationality?.name).toBe('Sweden')
    expect((await db.teams.get(37))?.name).toBe('Halfspace FC')

    await clearSportmonksCache()
    expect(await readSeasonTopscorers(25591)).toBeNull()
  })

  it('deduplicates in-flight and fresh prefetches', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, data: refresh() })
    installRequest(request)
    await Promise.all([prefetchSeasonTopscorers(25591), prefetchSeasonTopscorers(25591)])
    await prefetchSeasonTopscorers(25591)
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith({ seasonId: 25591 })
  })

  it('retains the last complete results when a refresh fails', async () => {
    await writeSeasonTopscorersRefresh(25591, { ...refresh(), fetchedAt: 1 })
    installRequest(
      vi
        .fn()
        .mockResolvedValue({ ok: false, error: { code: 'rate_limited', message: 'Limit reached' } })
    )
    await expect(prefetchSeasonTopscorers(25591)).rejects.toThrow('Limit reached')
    expect((await readSeasonTopscorers(25591))?.topscorers).toHaveLength(1)
  })

  it('does not repopulate the cache after disconnecting during a request', async () => {
    const pending = Promise.withResolvers<{ ok: true; data: SeasonTopscorersRefresh }>()
    const request = vi.fn(() => pending.promise)
    installRequest(request)
    const prefetch = prefetchSeasonTopscorers(25591)
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce())
    invalidateCompetitionWorkspaceRefreshes()
    await clearSportmonksCache()
    pending.resolve({ ok: true, data: refresh() })
    await prefetch
    expect(await readSeasonTopscorers(25591)).toBeNull()
  })
})
