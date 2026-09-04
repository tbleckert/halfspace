// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { invalidateLiveStandingsRefreshes, useLiveStandings } from './use-live-standings'

const cache = vi.hoisted(() => ({ standings: [], fetchedAt: 0, staleAt: 0 }))
vi.mock('@/lib/use-scoped-live-query', () => ({ useScopedLiveQuery: () => cache }))
vi.mock('@/data/db', () => ({
  readLiveStandings: vi.fn(),
  writeLiveStandingsRefresh: vi.fn(),
  liveStandingsQueryKey: () => '8:12'
}))
const input = { competitionId: 8, seasonId: 12 }

function Harness({ live, enabled = true }: { live: boolean; enabled?: boolean }): null {
  useLiveStandings(input, enabled, live)
  return null
}

beforeEach(() => {
  invalidateLiveStandingsRefreshes()
  vi.useFakeTimers()
  cache.fetchedAt = Date.now()
  cache.staleAt = Date.now() + 5 * 60_000
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('uses a 30-second cadence during play and pauses when the table is not active', async () => {
  const request = vi
    .fn()
    .mockResolvedValue({ ok: true, data: { standings: [], fetchedAt: Date.now() } })
  vi.stubGlobal('halfspace', { sportmonks: { refreshLiveStandings: request } })
  const { rerender, unmount } = render(<Harness live={false} />)
  await act(() => vi.advanceTimersByTimeAsync(30_000))
  expect(request).not.toHaveBeenCalled()
  rerender(<Harness live />)
  await act(() => vi.advanceTimersByTimeAsync(1))
  expect(request).toHaveBeenCalledOnce()
  rerender(<Harness live enabled={false} />)
  await act(() => vi.advanceTimersByTimeAsync(60_000))
  expect(request).toHaveBeenCalledOnce()
  unmount()
})

it('fetches the settled table once when the final in-play match ends', async () => {
  const request = vi
    .fn()
    .mockResolvedValue({ ok: true, data: { standings: [], fetchedAt: Date.now() } })
  vi.stubGlobal('halfspace', { sportmonks: { refreshLiveStandings: request } })
  const { rerender, unmount } = render(<Harness live />)
  await act(() => vi.advanceTimersByTimeAsync(1))
  expect(request).not.toHaveBeenCalled()
  rerender(<Harness live={false} />)
  await act(() => vi.advanceTimersByTimeAsync(1))
  expect(request).toHaveBeenCalledOnce()
  unmount()
})
