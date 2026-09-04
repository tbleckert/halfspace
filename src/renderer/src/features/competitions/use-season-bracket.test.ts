// @vitest-environment jsdom
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Result, SeasonBracketRefresh } from '@shared/contracts'
import { clearSportmonksCache, db, readSeasonBracket } from '@/data/db'
import { invalidateBracketRefreshes, refreshSeasonBracket } from './use-season-bracket'

beforeEach(async () => {
  invalidateBracketRefreshes()
  await clearSportmonksCache()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.close())
const data: SeasonBracketRefresh = { stages: [], catalog: [], edges: [], fetchedAt: Date.now() }

it('deduplicates concurrent requests for the same season', async () => {
  const request = vi.fn().mockResolvedValue({ ok: true, data })
  vi.stubGlobal('halfspace', { sportmonks: { refreshSeasonBracket: request } })
  await Promise.all([refreshSeasonBracket(1), refreshSeasonBracket(1)])
  expect(request).toHaveBeenCalledTimes(1)
  expect((await readSeasonBracket(1))?.edges).toEqual([])
})

it('discards a bracket from previous credentials', async () => {
  let resolve!: (value: Result<SeasonBracketRefresh>) => void
  const pending = new Promise<Result<SeasonBracketRefresh>>((done) => {
    resolve = done
  })
  vi.stubGlobal('halfspace', {
    sportmonks: { refreshSeasonBracket: vi.fn().mockReturnValue(pending) }
  })
  const request = refreshSeasonBracket(1)
  invalidateBracketRefreshes()
  resolve({ ok: true, data })
  await request
  expect(await readSeasonBracket(1)).toBeNull()
})
