// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  readFixturePredictions,
  writeFixturePredictionsRefresh,
  readExpectedLineups,
  writeExpectedLineupsRefresh,
  readFixtureExpectedMetrics,
  writeFixtureExpectedMetricsRefresh,
  readFixturePeriodStatistics,
  writeFixturePeriodStatisticsRefresh
} from '@/data/db'
import { usePredictions, invalidatePredictionsRefreshes } from './use-predictions'
import { useExpectedLineups, invalidateExpectedLineupsRefreshes } from './use-expected-lineups'
import { useExpectedMetrics, invalidateExpectedMetricsRefreshes } from './use-expected-metrics'
import { usePeriodStatistics, invalidatePeriodStatisticsRefreshes } from './use-period-statistics'

const queries = [
  {
    name: 'predictions',
    method: 'refreshFixturePredictions',
    useQuery: usePredictions,
    invalidate: invalidatePredictionsRefreshes,
    read: readFixturePredictions,
    data: (fetchedAt: number) => ({ fixtureId: 10, predictions: [], fetchedAt }),
    seed: (fetchedAt: number) =>
      writeFixturePredictionsRefresh(10, { fixtureId: 10, predictions: [], fetchedAt })
  },
  {
    name: 'expected lineups',
    method: 'refreshExpectedLineups',
    useQuery: useExpectedLineups,
    invalidate: invalidateExpectedLineupsRefreshes,
    read: readExpectedLineups,
    data: (fetchedAt: number) => ({ fixtureId: 10, lineups: [], fetchedAt }),
    seed: (fetchedAt: number) =>
      writeExpectedLineupsRefresh(10, { fixtureId: 10, lineups: [], fetchedAt })
  },
  {
    name: 'expected metrics',
    method: 'refreshFixtureExpectedMetrics',
    useQuery: useExpectedMetrics,
    invalidate: invalidateExpectedMetricsRefreshes,
    read: readFixtureExpectedMetrics,
    data: (fetchedAt: number) => ({ fixtureId: 10, statistics: [], fetchedAt }),
    seed: (fetchedAt: number) =>
      writeFixtureExpectedMetricsRefresh(10, { fixtureId: 10, statistics: [], fetchedAt })
  },
  {
    name: 'period statistics',
    method: 'refreshFixturePeriodStatistics',
    useQuery: usePeriodStatistics,
    invalidate: invalidatePeriodStatisticsRefreshes,
    read: readFixturePeriodStatistics,
    data: (fetchedAt: number) => ({ fixtureId: 10, periods: [], fetchedAt }),
    seed: (fetchedAt: number) =>
      writeFixturePeriodStatisticsRefresh(10, { fixtureId: 10, periods: [], fetchedAt })
  }
]

beforeEach(async () => {
  for (const query of queries) query.invalidate()
  await clearSportmonksCache()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
afterAll(() => db.close())

it.each(queries)(
  '$name shares requests and ignores responses after credential replacement',
  async ({ useQuery, method, invalidate, read, data }) => {
    let complete!: (value: unknown) => void
    const request = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        complete = resolve
      })
    )
    vi.stubGlobal('halfspace', { sportmonks: { [method]: request } })
    renderHook(() => {
      useQuery(10, true, false)
      useQuery(10, true, false)
    })
    await waitFor(() => expect(request).toHaveBeenCalledOnce())
    invalidate()
    await act(async () => {
      complete({ ok: true, data: data(Date.now()) })
    })
    expect(await read(10)).toBeNull()
  }
)

it.each(queries)(
  '$name reads offline cache without exposing another fixture identity',
  async ({ useQuery, method, seed }) => {
    await seed(Date.now())
    const request = vi.fn()
    vi.stubGlobal('halfspace', { sportmonks: { [method]: request } })
    const { result, rerender } = renderHook(({ id }) => useQuery(id, false, false), {
      initialProps: { id: 10 }
    })
    await waitFor(() => expect(result.current.cached?.fixtureId).toBe(10))
    rerender({ id: 11 })
    expect(result.current.cached?.fixtureId).not.toBe(10)
    await waitFor(() => expect(result.current.cached).toBeNull())
    expect(request).not.toHaveBeenCalled()
  }
)

it.each(queries.slice(2))(
  '$name refreshes overdue live data on visibility and after full time',
  async ({ useQuery, method, seed, data }) => {
    await seed(Date.now() - 60_000)
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    const request = vi.fn().mockImplementation(async () => ({ ok: true, data: data(Date.now()) }))
    vi.stubGlobal('halfspace', { sportmonks: { [method]: request } })
    const { result, rerender } = renderHook(({ live }) => useQuery(10, true, live), {
      initialProps: { live: true }
    })
    await waitFor(() => expect(result.current.cached?.fixtureId).toBe(10))
    expect(request).not.toHaveBeenCalled()
    visibility.mockReturnValue('visible')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    await waitFor(() => expect(request).toHaveBeenCalledOnce())
    await waitFor(() => expect(result.current.refreshing).toBe(false))
    rerender({ live: false })
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
  }
)

it.each(queries.slice(2))(
  '$name defers its final reading until a hidden or offline view resumes',
  async ({ useQuery, method, seed, data }) => {
    await seed(Date.now())
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    const request = vi.fn().mockImplementation(async () => ({ ok: true, data: data(Date.now()) }))
    vi.stubGlobal('halfspace', { sportmonks: { [method]: request } })
    const { result, rerender } = renderHook(({ live, enabled }) => useQuery(10, enabled, live), {
      initialProps: { live: true, enabled: false }
    })
    await waitFor(() => expect(result.current.cached?.fixtureId).toBe(10))
    rerender({ live: false, enabled: false })
    rerender({ live: false, enabled: true })
    expect(request).not.toHaveBeenCalled()
    visibility.mockReturnValue('visible')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    await waitFor(() => expect(request).toHaveBeenCalledOnce())
  }
)
