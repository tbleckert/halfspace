// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { FixtureOddsRefresh, OddsFeed, Result } from '@shared/contracts'
import { clearSportmonksCache, db, readFixtureOdds, writeFixtureOddsRefresh } from '@/data/db'
import { invalidateFixtureRefreshes, useFixtureOdds } from './use-fixtures'

beforeEach(async () => {
  invalidateFixtureRefreshes()
  await clearSportmonksCache()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.close())

it('refreshes 30-second-old in-play quotes only for an open ongoing match', async () => {
  const fetchedAt = Date.now() - 31_000
  for (const feed of ['pre-match', 'inplay'] as const)
    await writeFixtureOddsRefresh(10, feed, { odds: [], fetchedAt })
  const refreshFixtureOdds = vi
    .fn()
    .mockImplementation(async () => ({ ok: true, data: { odds: [], fetchedAt: Date.now() } }))
  vi.stubGlobal('halfspace', { sportmonks: { refreshFixtureOdds } })
  const { result, rerender } = renderHook(
    ({ enabled, live, feed }: { enabled: boolean; live: boolean; feed: OddsFeed }) =>
      useFixtureOdds(10, enabled, feed, live),
    { initialProps: { enabled: false, live: true, feed: 'inplay' } }
  )
  await waitFor(() => expect(result.current.cached?.query).toBeTruthy())
  expect(refreshFixtureOdds).not.toHaveBeenCalled()
  rerender({ enabled: true, live: false, feed: 'inplay' })
  expect(refreshFixtureOdds).not.toHaveBeenCalled()
  rerender({ enabled: true, live: true, feed: 'inplay' })
  await waitFor(() => expect(refreshFixtureOdds).toHaveBeenCalledOnce())
  expect(refreshFixtureOdds).toHaveBeenCalledWith({ fixtureId: 10, feed: 'inplay' })
  rerender({ enabled: true, live: true, feed: 'pre-match' })
  await waitFor(() => expect(result.current.cached?.query?.fetchedAt).toBe(fetchedAt))
  expect(refreshFixtureOdds).toHaveBeenCalledOnce()
})

it('does not restore pending odds after a credential reset', async () => {
  let resolve!: (value: Result<FixtureOddsRefresh>) => void
  const pending = new Promise<Result<FixtureOddsRefresh>>((done) => {
    resolve = done
  })
  const refreshFixtureOdds = vi.fn().mockReturnValue(pending)
  vi.stubGlobal('halfspace', { sportmonks: { refreshFixtureOdds } })
  const { unmount } = renderHook(() => useFixtureOdds(10, true, 'inplay', true))
  await waitFor(() => expect(refreshFixtureOdds).toHaveBeenCalledOnce())
  unmount()
  invalidateFixtureRefreshes()
  await act(async () => {
    resolve({ ok: true, data: { odds: [], fetchedAt: Date.now() } })
    await pending
  })
  expect((await readFixtureOdds(10, 'inplay')).query).toBeNull()
})
