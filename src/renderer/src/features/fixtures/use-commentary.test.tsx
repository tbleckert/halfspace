// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { invalidateCommentaryRefreshes, useCommentary } from './use-commentary'

const cache = vi.hoisted(() => ({ fixtureId: 50, commentaries: [], fetchedAt: 0, staleAt: 0 }))
vi.mock('@/lib/use-scoped-live-query', () => ({ useScopedLiveQuery: () => cache }))
vi.mock('@/data/db', () => ({
  readFixtureCommentary: vi.fn(),
  writeFixtureCommentaryRefresh: vi.fn()
}))

function Harness({ enabled, live }: { enabled: boolean; live: boolean }): null {
  useCommentary(50, enabled, live)
  return null
}

beforeEach(() => {
  invalidateCommentaryRefreshes()
  vi.useFakeTimers()
  cache.fetchedAt = Date.now()
  cache.staleAt = cache.fetchedAt + 300_000
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('commentary polling', () => {
  it('loads only when open and limits a live cache to 30 seconds', async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { fetchedAt: Date.now(), commentaries: [] } })
    vi.stubGlobal('halfspace', { sportmonks: { refreshFixtureCommentary: request } })
    const { rerender } = render(<Harness enabled={false} live />)
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(request).not.toHaveBeenCalled()
    rerender(<Harness enabled live />)
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(request).toHaveBeenCalledTimes(1)
    rerender(<Harness enabled={false} live />)
    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(request).toHaveBeenCalledTimes(1)
  })
  it('does not poll completed matches on the live interval', async () => {
    const request = vi.fn()
    vi.stubGlobal('halfspace', { sportmonks: { refreshFixtureCommentary: request } })
    render(<Harness enabled live={false} />)
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(request).not.toHaveBeenCalled()
  })
})
