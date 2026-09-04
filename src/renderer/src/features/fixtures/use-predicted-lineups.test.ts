// @vitest-environment jsdom
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  readPredictedLineups,
  writePredictedLineupsRefresh
} from '@/data/db'
import {
  invalidatePredictedLineupsRefreshes,
  refreshPredictedLineups
} from './use-predicted-lineups'
import type { PredictedLineupsRefresh, Result } from '@shared/contracts'
beforeEach(async () => {
  invalidatePredictedLineupsRefreshes()
  await clearSportmonksCache()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.close())
const data: PredictedLineupsRefresh = {
  fixtureId: 10,
  fetchedAt: 200,
  lineups: [
    {
      id: 1,
      fixture_id: 10,
      team_id: 19,
      player_id: 100,
      position_id: 27,
      type_id: 111384,
      player_name: 'Predicted player',
      jersey_number: 9
    }
  ]
}
it('caches predictions separately without creating a confirmed fixture or player appearance', async () => {
  await writePredictedLineupsRefresh(10, data)
  expect((await readPredictedLineups(10))?.lineups).toHaveLength(1)
  expect(await db.fixtures.get(10)).toBeUndefined()
  await writePredictedLineupsRefresh(10, { ...data, fetchedAt: 100, lineups: [] })
  expect((await readPredictedLineups(10))?.lineups).toHaveLength(1)
  await expect(writePredictedLineupsRefresh(11, data)).rejects.toThrow()
  expect(await readPredictedLineups(11)).toBeNull()
  await clearSportmonksCache()
  expect(await readPredictedLineups(10)).toBeNull()
})
it('deduplicates requests and discards responses after credential replacement', async () => {
  let resolve!: (value: Result<PredictedLineupsRefresh>) => void
  const pending = new Promise<Result<PredictedLineupsRefresh>>((done) => {
    resolve = done
  })
  const api = vi.fn().mockReturnValue(pending)
  vi.stubGlobal('halfspace', { sportmonks: { refreshPredictedLineups: api } })
  const first = refreshPredictedLineups(10)
  const second = refreshPredictedLineups(10)
  expect(api).toHaveBeenCalledTimes(1)
  invalidatePredictedLineupsRefreshes()
  resolve({ ok: true, data })
  await Promise.all([first, second])
  expect(await readPredictedLineups(10)).toBeNull()
})
