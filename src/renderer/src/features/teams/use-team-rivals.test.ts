// @vitest-environment jsdom
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Result, TeamRivalsRefresh } from '@shared/contracts'
import { clearSportmonksCache, db, readTeamRivals } from '@/data/db'
import { invalidateRivalRefreshes, refreshTeamRivals } from './use-team-rivals'

beforeEach(async () => {
  invalidateRivalRefreshes()
  await clearSportmonksCache()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.close())

describe('rival refresh', () => {
  it('deduplicates concurrent requests', async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { rivals: [], fetchedAt: Date.now() } })
    vi.stubGlobal('halfspace', { sportmonks: { refreshTeamRivals: request } })
    await Promise.all([refreshTeamRivals(1), refreshTeamRivals(1)])
    expect(request).toHaveBeenCalledTimes(1)
    expect((await readTeamRivals(1))?.rivals).toEqual([])
  })
  it('discards a response from previous credentials', async () => {
    let resolve!: (value: Result<TeamRivalsRefresh>) => void
    const pending = new Promise<Result<TeamRivalsRefresh>>((done) => {
      resolve = done
    })
    vi.stubGlobal('halfspace', {
      sportmonks: { refreshTeamRivals: vi.fn().mockReturnValue(pending) }
    })
    const request = refreshTeamRivals(1)
    invalidateRivalRefreshes()
    resolve({ ok: true, data: { rivals: [], fetchedAt: Date.now() } })
    await request
    expect(await readTeamRivals(1)).toBeNull()
  })
})
