// @vitest-environment jsdom

import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStaleRefresh } from './refresh'

function RefreshHarness({
  cacheLoaded = true,
  enabled = true,
  refresh,
  staleAt
}: {
  cacheLoaded?: boolean
  enabled?: boolean
  refresh: () => Promise<void>
  staleAt?: number
}): null {
  useStaleRefresh(enabled, cacheLoaded, staleAt, refresh)
  return null
}

describe('useStaleRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-31T10:00:00Z'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('refreshes when the cached query becomes stale', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined)
    render(<RefreshHarness refresh={refresh} staleAt={Date.now() + 1_000} />)

    await act(() => vi.advanceTimersByTimeAsync(999))
    expect(refresh).not.toHaveBeenCalled()

    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('does not schedule a refresh until the query is enabled and loaded', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined)
    const { rerender } = render(
      <RefreshHarness cacheLoaded={false} enabled={false} refresh={refresh} />
    )

    await act(() => vi.runOnlyPendingTimersAsync())
    expect(refresh).not.toHaveBeenCalled()

    rerender(<RefreshHarness refresh={refresh} />)
    await act(() => vi.runOnlyPendingTimersAsync())
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('retries a stale query after a failed refresh without a navigation', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValue(undefined)
    const refresh = vi.fn(async () => {
      // Query hooks report failures in the UI without rejecting their refresh callback.
      await request().catch(() => undefined)
    })
    render(<RefreshHarness refresh={refresh} staleAt={Date.now()} />)

    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(request).toHaveBeenCalledOnce()
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('waits until the app is visible before refreshing an overdue query', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    const refresh = vi.fn().mockResolvedValue(undefined)
    render(<RefreshHarness refresh={refresh} staleAt={Date.now()} />)

    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(refresh).not.toHaveBeenCalled()

    visibility.mockReturnValue('visible')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('keeps a fresh query cached when focus returns', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined)
    render(<RefreshHarness refresh={refresh} staleAt={Date.now() + 60_000} />)

    act(() => window.dispatchEvent(new Event('focus')))
    await act(() => vi.advanceTimersByTimeAsync(1_000))
    expect(refresh).not.toHaveBeenCalled()
  })

  it('keeps cached data offline and resumes overdue work on reconnect', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const refresh = vi.fn().mockResolvedValue(undefined)
    render(<RefreshHarness refresh={refresh} staleAt={Date.now()} />)

    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(refresh).not.toHaveBeenCalled()
    online.mockReturnValue(true)
    act(() => window.dispatchEvent(new Event('online')))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('uses the updated cache expiry instead of retrying a successful refresh', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined)
    const { rerender } = render(<RefreshHarness refresh={refresh} staleAt={Date.now()} />)
    await act(() => vi.advanceTimersByTimeAsync(0))

    rerender(<RefreshHarness refresh={refresh} staleAt={Date.now() + 60_000} />)
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(refresh).toHaveBeenCalledOnce()
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('does not overlap a pending refresh when focus returns', async () => {
    let finish!: () => void
    const refresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    const { unmount } = render(<RefreshHarness refresh={refresh} staleAt={Date.now()} />)

    await act(() => vi.advanceTimersByTimeAsync(0))
    act(() => window.dispatchEvent(new Event('focus')))
    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(refresh).toHaveBeenCalledOnce()

    unmount()
    await act(async () => finish())
    expect(vi.getTimerCount()).toBe(0)
  })
})
