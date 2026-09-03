// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { invalidatePressureRefreshes, usePressure } from './use-pressure'

const cache = vi.hoisted(() => ({ fixtureId: 50, points: [], fetchedAt: 0, staleAt: 0 }))
vi.mock('@/lib/use-scoped-live-query', () => ({ useScopedLiveQuery: () => cache }))
vi.mock('@/data/db', () => ({ readFixturePressure: vi.fn(), writeFixturePressureRefresh: vi.fn() }))

function Harness({ enabled, live }: { enabled: boolean; live: boolean }): null {
  usePressure(50, enabled, live)
  return null
}

beforeEach(() => {
  invalidatePressureRefreshes()
  vi.useFakeTimers()
  cache.fetchedAt = Date.now()
  cache.staleAt = cache.fetchedAt + 3_600_000
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('pressure refresh', () => {
  it('refreshes an ongoing match after 30 seconds only while Stats is open', async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { fetchedAt: Date.now(), points: [] } })
    vi.stubGlobal('halfspace', { sportmonks: { refreshFixturePressure: request } })
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
    vi.stubGlobal('halfspace', { sportmonks: { refreshFixturePressure: request } })
    const { unmount } = render(<Harness enabled live={false} />)
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(request).not.toHaveBeenCalled()
    unmount()
  })
})
