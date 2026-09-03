// @vitest-environment jsdom
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Result, StatisticSeasonsRefresh } from '@shared/contracts'
import { clearSportmonksCache, db, readStatisticSeasons } from '@/data/db'
import {
  invalidateStatisticSeasonRefreshes,
  refreshStatisticSeasons
} from './use-statistic-seasons'

beforeEach(async () => {
  invalidateStatisticSeasonRefreshes()
  await clearSportmonksCache()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.close())

it('deduplicates concurrent season discovery for the same entity', async () => {
  const request = vi
    .fn()
    .mockResolvedValue({ ok: true, data: { records: [], fetchedAt: Date.now() } })
  vi.stubGlobal('halfspace', { sportmonks: { refreshStatisticSeasons: request } })
  const input = { entity: 'players', entityId: 100 } as const
  await Promise.all([refreshStatisticSeasons(input), refreshStatisticSeasons(input)])
  expect(request).toHaveBeenCalledTimes(1)
  expect((await readStatisticSeasons(input))?.records).toEqual([])
})

it('discards season metadata from abandoned credentials', async () => {
  let resolve!: (value: Result<StatisticSeasonsRefresh>) => void
  const pending = new Promise<Result<StatisticSeasonsRefresh>>((done) => {
    resolve = done
  })
  vi.stubGlobal('halfspace', {
    sportmonks: { refreshStatisticSeasons: vi.fn().mockReturnValue(pending) }
  })
  const input = { entity: 'teams', entityId: 19 } as const
  const request = refreshStatisticSeasons(input)
  invalidateStatisticSeasonRefreshes()
  await clearSportmonksCache()
  resolve({ ok: true, data: { records: [], fetchedAt: Date.now() } })
  await request
  expect(await readStatisticSeasons(input)).toBeNull()
})
