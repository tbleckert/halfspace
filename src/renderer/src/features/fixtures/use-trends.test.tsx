// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { invalidateTrendsRefreshes, useTrends } from './use-trends'

const cache = vi.hoisted(() => ({
  fixtureId: 50,
  points: [],
  periods: [],
  fetchedAt: 0,
  staleAt: 0
}))
vi.mock('@/lib/use-scoped-live-query', () => ({ useScopedLiveQuery: () => cache }))
vi.mock('@/data/db', () => ({ readFixtureTrends: vi.fn(), writeFixtureTrendsRefresh: vi.fn() }))

function Harness({ enabled, live }: { enabled: boolean; live: boolean }): null {
  useTrends(50, enabled, live)
  return null
}

beforeEach(() => {
  invalidateTrendsRefreshes()
  vi.useFakeTimers()
  cache.fetchedAt = Date.now()
  cache.staleAt = cache.fetchedAt + 3_600_000
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('trends refresh', () => {
  it('refreshes an ongoing match after 30 seconds only while Game is open', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      data: { fetchedAt: Date.now(), points: [], periods: [], fixtureId: 50 }
    })
    vi.stubGlobal('halfspace', { sportmonks: { refreshFixtureTrends: request } })
    const { rerender, unmount } = render(<Harness enabled={false} live />)
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(request).not.toHaveBeenCalled()
    rerender(<Harness enabled live />)
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(request).toHaveBeenCalledOnce()
    rerender(<Harness enabled={false} live />)
    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(request).toHaveBeenCalledOnce()
    unmount()
  })
  it('keeps completed matches on the normal cache window', async () => {
    const request = vi.fn()
    vi.stubGlobal('halfspace', { sportmonks: { refreshFixtureTrends: request } })
    const { unmount } = render(<Harness enabled live={false} />)
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(request).not.toHaveBeenCalled()
    unmount()
  })
  it('fetches the final readings when the match ends', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      data: { fixtureId: 50, fetchedAt: Date.now(), points: [], periods: [] }
    })
    vi.stubGlobal('halfspace', { sportmonks: { refreshFixtureTrends: request } })
    const { rerender, unmount } = render(<Harness enabled live />)
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(request).not.toHaveBeenCalled()
    rerender(<Harness enabled live={false} />)
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(request).toHaveBeenCalledOnce()
    unmount()
  })
})
