// @vitest-environment jsdom

import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useScopedLiveQuery } from './use-scoped-live-query'

describe('scoped live queries', () => {
  it('invalidates results when either entity or season changes, including an empty cached value', async () => {
    const { result, rerender } = renderHook(
      ({ id, season }) =>
        useScopedLiveQuery(
          () => Promise.resolve(season === null ? null : `${id}:${season}`),
          [id, season]
        ),
      { initialProps: { id: 1, season: null as number | null } }
    )
    await waitFor(() => expect(result.current).toBeNull())
    rerender({ id: 1, season: 2026 })
    expect(result.current).toBeUndefined()
    await waitFor(() => expect(result.current).toBe('1:2026'))
    rerender({ id: 2, season: 2026 })
    expect(result.current).toBeUndefined()
    await waitFor(() => expect(result.current).toBe('2:2026'))
  })

  it('retains cached data and its subscription across unrelated view changes', async () => {
    const query = vi.fn(async () => 'cached overview')
    const { result, rerender } = renderHook(
      ({ view }) => ({
        view,
        cached: useScopedLiveQuery(query, [1])
      }),
      { initialProps: { view: 'overview' } }
    )
    await waitFor(() => expect(result.current.cached).toBe('cached overview'))
    rerender({ view: 'fixtures' })
    expect(result.current.cached).toBe('cached overview')
    expect(query).toHaveBeenCalledTimes(1)
  })
})
