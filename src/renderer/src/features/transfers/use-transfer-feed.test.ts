// @vitest-environment jsdom
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Result, TransferFeedRefresh } from '@shared/contracts'
import { clearSportmonksCache, db, readTransferFeed } from '@/data/db'
import { invalidateTransferFeedRefreshes, refreshTransferFeed } from './use-transfer-feed'

beforeEach(async () => {
  invalidateTransferFeedRefreshes()
  await clearSportmonksCache()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.close())

it('deduplicates requests and keeps failed pages uncached', async () => {
  const request = vi.fn().mockResolvedValue({ ok: false, error: { message: 'Rate limit reached' } })
  vi.stubGlobal('halfspace', { sportmonks: { refreshTransferFeed: request } })
  await Promise.allSettled([
    refreshTransferFeed({ feed: 'latest', page: 1 }),
    refreshTransferFeed({ feed: 'latest', page: 1 })
  ])
  expect(request).toHaveBeenCalledTimes(1)
  expect((await readTransferFeed({ feed: 'latest', page: 1 })).query).toBeNull()
})

it('does not restore transfer pages after changing credentials', async () => {
  let resolve!: (result: Result<TransferFeedRefresh>) => void
  const promise = new Promise<Result<TransferFeedRefresh>>((done) => {
    resolve = done
  })
  vi.stubGlobal('halfspace', {
    sportmonks: { refreshTransferFeed: vi.fn().mockReturnValue(promise) }
  })
  const old = refreshTransferFeed({ feed: 'latest', page: 1 })
  invalidateTransferFeedRefreshes()
  resolve({ ok: true, data: { transfers: [], page: 1, hasMore: false, fetchedAt: Date.now() } })
  await old
  expect((await readTransferFeed({ feed: 'latest', page: 1 })).query).toBeNull()
})
