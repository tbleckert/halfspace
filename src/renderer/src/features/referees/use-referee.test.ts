// @vitest-environment jsdom

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RefereeRefresh, Result } from '@shared/contracts'
import { clearSportmonksCache, db, readRefereeIdentity } from '@/data/db'
import {
  invalidateRefereeRefreshes,
  prefetchRefereeEntity,
  refreshRefereeEntity
} from './use-referee'

const refresh = (name = 'Alex Official'): RefereeRefresh => ({
  referee: { id: 7, name, display_name: name, country_id: null, latest: [] },
  fetchedAt: Date.now()
})

beforeEach(async () => {
  invalidateRefereeRefreshes()
  await clearSportmonksCache()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.close())

describe('referee refresh', () => {
  it('deduplicates intent requests and reuses fresh cached appointments', async () => {
    const refreshReferee = vi.fn().mockResolvedValue({ ok: true, data: refresh() })
    vi.stubGlobal('halfspace', { sportmonks: { refreshReferee } })
    await Promise.all([prefetchRefereeEntity(7), prefetchRefereeEntity(7)])
    await prefetchRefereeEntity(7)
    expect(refreshReferee).toHaveBeenCalledTimes(1)
    expect((await readRefereeIdentity(7)).referee?.detailed).toBe(true)
  })

  it('discards responses from previous credentials', async () => {
    let resolve!: (value: Result<RefereeRefresh>) => void
    const pending = new Promise<Result<RefereeRefresh>>((done) => {
      resolve = done
    })
    const refreshReferee = vi
      .fn()
      .mockReturnValueOnce(pending)
      .mockResolvedValueOnce({ ok: true, data: refresh('New Official') })
    vi.stubGlobal('halfspace', { sportmonks: { refreshReferee } })
    const old = refreshRefereeEntity(7)
    invalidateRefereeRefreshes()
    await refreshRefereeEntity(7)
    resolve({ ok: true, data: refresh('Old Official') })
    await old
    expect((await readRefereeIdentity(7)).referee?.raw.name).toBe('New Official')
  })
})
