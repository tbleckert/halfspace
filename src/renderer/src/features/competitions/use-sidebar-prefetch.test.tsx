// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CachedCompetition } from '@/data/db'
import { prefetchCompetitionWorkspace } from './use-competition-workspace'
import { useSidebarPrefetch } from './use-sidebar-prefetch'

vi.mock('./use-competition-workspace', () => ({ prefetchCompetitionWorkspace: vi.fn() }))
vi.mock('@/features/fixtures/use-fixtures', () => ({
  prefetchFixtureQuery: vi.fn().mockResolvedValue(undefined)
}))

const competitions = [{ id: 573 }, { id: 8 }] as CachedCompetition[]

beforeEach(() => {
  vi.mocked(prefetchCompetitionWorkspace).mockReset().mockResolvedValue(undefined)
})

describe('sidebar background prefetch', () => {
  it.each(['unmount', 'offline'] as const)('stops the remaining queue on %s', async (stop) => {
    const first = Promise.withResolvers<void>()
    vi.mocked(prefetchCompetitionWorkspace).mockReturnValueOnce(first.promise)
    const { rerender, unmount } = renderHook(
      ({ online }) => useSidebarPrefetch(competitions, '2026-09-03', 'UTC', online),
      { initialProps: { online: true } }
    )
    await waitFor(() => expect(prefetchCompetitionWorkspace).toHaveBeenCalledWith(573))
    if (stop === 'unmount') unmount()
    else rerender({ online: false })

    await act(async () => {
      first.resolve()
      await first.promise
    })
    expect(prefetchCompetitionWorkspace).not.toHaveBeenCalledWith(8)
  })

  it('warms competitions sequentially and skips ones already warmed', async () => {
    const first = Promise.withResolvers<void>()
    vi.mocked(prefetchCompetitionWorkspace).mockReturnValueOnce(first.promise)
    const { rerender } = renderHook(
      ({ date }) => useSidebarPrefetch(competitions, date, 'UTC', true),
      { initialProps: { date: '2026-09-03' } }
    )
    expect(prefetchCompetitionWorkspace).toHaveBeenCalledTimes(1)
    await act(async () => {
      first.resolve()
      await first.promise
    })
    expect(prefetchCompetitionWorkspace).toHaveBeenCalledTimes(2)
    rerender({ date: '2026-09-04' })
    expect(prefetchCompetitionWorkspace).toHaveBeenCalledTimes(2)
  })
})
