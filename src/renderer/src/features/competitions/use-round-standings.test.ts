// @vitest-environment jsdom
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Result, StandingsRefresh } from '@shared/contracts'
import { clearSportmonksCache, db, readRoundStandings } from '@/data/db'
import { invalidateRoundStandingsRefreshes, refreshRoundStandings } from './use-round-standings'

beforeEach(async () => {
  invalidateRoundStandingsRefreshes()
  await clearSportmonksCache()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.close())

it('deduplicates concurrent requests for a round', async () => {
  const request = vi
    .fn()
    .mockResolvedValue({ ok: true, data: { standings: [], fetchedAt: Date.now() } })
  vi.stubGlobal('halfspace', { sportmonks: { refreshRoundStandings: request } })
  await Promise.all([
    refreshRoundStandings({ seasonId: 12, roundId: 4 }),
    refreshRoundStandings({ seasonId: 12, roundId: 4 })
  ])
  expect(request).toHaveBeenCalledTimes(1)
  expect((await readRoundStandings({ seasonId: 12, roundId: 4 }))?.standings).toEqual([])
})

it('does not repopulate round tables after credentials change', async () => {
  let resolve!: (result: Result<StandingsRefresh>) => void
  const pending = new Promise<Result<StandingsRefresh>>((done) => {
    resolve = done
  })
  vi.stubGlobal('halfspace', {
    sportmonks: { refreshRoundStandings: vi.fn().mockReturnValue(pending) }
  })
  const old = refreshRoundStandings({ seasonId: 12, roundId: 4 })
  invalidateRoundStandingsRefreshes()
  resolve({ ok: true, data: { standings: [], fetchedAt: Date.now() } })
  await old
  expect(await readRoundStandings({ seasonId: 12, roundId: 4 })).toBeNull()
})
