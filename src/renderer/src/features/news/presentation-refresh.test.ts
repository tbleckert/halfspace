// @vitest-environment jsdom
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import { clearSportmonksCache, db, readNews, readMatchFacts, readHonours } from '@/data/db'
import { invalidateNewsRefreshes, refreshNews } from './use-news'
import {
  invalidateMatchFactsRefreshes,
  refreshMatchFacts
} from '@/features/fixtures/use-match-facts'
import { invalidateHonoursRefreshes, refreshHonours } from '@/features/honours/use-honours'
const newsInput = { kind: 'feed' as const, feed: 'pre-match' as const, page: 1 }
const honourInput = { entity: 'teams' as const, entityId: 19 }
const cases = [
  {
    name: 'news',
    api: 'refreshNews',
    invalidate: invalidateNewsRefreshes,
    run: () => refreshNews(newsInput),
    read: () => readNews(newsInput),
    data: { articles: [], hasMore: false, fetchedAt: 200 }
  },
  {
    name: 'facts',
    api: 'refreshMatchFacts',
    invalidate: invalidateMatchFactsRefreshes,
    run: () => refreshMatchFacts(10),
    read: () => readMatchFacts(10),
    data: { fixtureId: 10, facts: [], fetchedAt: 200 }
  },
  {
    name: 'honours',
    api: 'refreshHonours',
    invalidate: invalidateHonoursRefreshes,
    run: () => refreshHonours(honourInput),
    read: () => readHonours(honourInput),
    data: { ...honourInput, honours: [], fetchedAt: 200 }
  }
]
beforeEach(async () => {
  cases.forEach((item) => item.invalidate())
  await clearSportmonksCache()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.close())
it.each(cases)('deduplicates $name refreshes', async (entry) => {
  const api = vi.fn().mockResolvedValue({ ok: true, data: entry.data })
  vi.stubGlobal('halfspace', { sportmonks: { [entry.api]: api } })
  await Promise.all([entry.run(), entry.run()])
  expect(api).toHaveBeenCalledTimes(1)
  expect(await entry.read()).not.toBeNull()
})
it.each(cases)('discards $name responses after credential replacement', async (entry) => {
  let resolve!: (value: unknown) => void
  const pending = new Promise((done) => {
    resolve = done
  })
  vi.stubGlobal('halfspace', { sportmonks: { [entry.api]: vi.fn().mockReturnValue(pending) } })
  const request = entry.run()
  entry.invalidate()
  resolve({ ok: true, data: entry.data })
  await request
  expect(await entry.read()).toBeNull()
})
