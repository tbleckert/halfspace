// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EntitySearchRefresh, Result } from '@shared/contracts'
import { writeEntitySearchRefresh } from '@/data/db'
import { invalidateSearchRefreshes, useEntitySearch } from './use-entity-search'

vi.mock('@/data/db', () => ({
  readEntitySearch: vi.fn(),
  writeEntitySearchRefresh: vi.fn().mockResolvedValue(undefined)
}))
vi.mock('@/lib/use-scoped-live-query', () => ({ useScopedLiveQuery: () => [] }))

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  invalidateSearchRefreshes()
})
afterEach(() => vi.useRealTimers())

describe('search credential boundary', () => {
  it('does not persist a response requested with previous credentials', async () => {
    const response = Promise.withResolvers<Result<EntitySearchRefresh>>()
    const searchEntities = vi.fn().mockReturnValue(response.promise)
    window.halfspace = { sportmonks: { searchEntities } } as unknown as typeof window.halfspace
    renderHook(() => useEntitySearch('Roma', true, true))
    await act(() => vi.advanceTimersByTimeAsync(300))
    expect(searchEntities).toHaveBeenCalledWith({ query: 'Roma' })

    invalidateSearchRefreshes()
    await act(async () => {
      response.resolve({
        ok: true,
        data: {
          competitions: [],
          teams: [],
          players: [],
          coaches: [],
          referees: [],
          fixtures: [],
          venues: [],
          fetchedAt: Date.now()
        }
      })
      await response.promise
    })
    expect(writeEntitySearchRefresh).not.toHaveBeenCalled()
  })

  it('does not start a queued request after credentials change', async () => {
    const searchEntities = vi.fn().mockResolvedValue({ ok: false, error: { message: 'Unused' } })
    window.halfspace = { sportmonks: { searchEntities } } as unknown as typeof window.halfspace
    renderHook(() => useEntitySearch('Roma', true, true))
    invalidateSearchRefreshes()
    await act(() => vi.advanceTimersByTimeAsync(300))
    expect(searchEntities).not.toHaveBeenCalled()
  })
})
