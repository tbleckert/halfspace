// @vitest-environment jsdom
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Result, SeasonScheduleRefresh } from '@shared/contracts'
import { clearSportmonksCache, db, readSeasonSchedule } from '@/data/db'
import {
  invalidateScheduleRefreshes,
  prefetchSeasonSchedule,
  refreshSeasonSchedule
} from './use-season-schedule'

beforeEach(async () => {
  invalidateScheduleRefreshes()
  await clearSportmonksCache()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.close())

describe('schedule refresh', () => {
  it('deduplicates intent requests and reuses a fresh season cache', async () => {
    const refreshSeasonSchedule = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { stages: [], fetchedAt: Date.now() } })
    vi.stubGlobal('halfspace', { sportmonks: { refreshSeasonSchedule } })
    await Promise.all([prefetchSeasonSchedule(1), prefetchSeasonSchedule(1)])
    await prefetchSeasonSchedule(1)
    expect(refreshSeasonSchedule).toHaveBeenCalledTimes(1)
  })
  it('does not repopulate the cache after credentials change', async () => {
    let resolve!: (value: Result<SeasonScheduleRefresh>) => void
    const pending = new Promise<Result<SeasonScheduleRefresh>>((done) => {
      resolve = done
    })
    vi.stubGlobal('halfspace', {
      sportmonks: { refreshSeasonSchedule: vi.fn().mockReturnValue(pending) }
    })
    const old = refreshSeasonSchedule(1)
    invalidateScheduleRefreshes()
    resolve({ ok: true, data: { stages: [], fetchedAt: Date.now() } })
    await old
    expect(await readSeasonSchedule(1)).toBeNull()
  })
})
