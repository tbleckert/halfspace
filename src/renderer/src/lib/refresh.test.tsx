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
})
