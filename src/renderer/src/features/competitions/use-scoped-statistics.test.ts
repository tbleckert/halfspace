// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Result, SeasonStatisticsRefresh } from '@shared/contracts'
import {
  clearSportmonksCache,
  db,
  readSeasonStatistics,
  writeSeasonStatisticsRefresh
} from '@/data/db'
import {
  invalidateCompetitionWorkspaceRefreshes,
  useSeasonStatistics
} from './use-competition-workspace'

vi.mock('@/lib/refresh', () => ({ useStaleRefresh: vi.fn() }))
beforeEach(async () => {
  invalidateCompetitionWorkspaceRefreshes()
  await clearSportmonksCache()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.close())

it('keeps late errors and cached values scoped to the selected round', async () => {
  for (const roundId of [20, 21])
    await writeSeasonStatisticsRefresh(
      1,
      {
        fetchedAt: Date.now(),
        stageId: 10,
        roundId,
        statistics: [{ id: roundId, model_id: roundId, type_id: 188, value: { played: roundId } }]
      },
      10,
      roundId
    )
  const pending = Promise.withResolvers<Result<SeasonStatisticsRefresh>>()
  vi.stubGlobal('halfspace', {
    sportmonks: { refreshSeasonStatistics: vi.fn(() => pending.promise) }
  })
  const hook = renderHook(({ roundId }) => useSeasonStatistics(1, true, 10, roundId), {
    initialProps: { roundId: 20 }
  })
  await waitFor(() => expect(hook.result.current.cached?.statistics[0].model_id).toBe(20))
  let refresh!: Promise<void>
  act(() => {
    refresh = hook.result.current.refresh()
  })
  hook.rerender({ roundId: 21 })
  expect(hook.result.current.cached).toBeUndefined()
  await waitFor(() => expect(hook.result.current.cached?.statistics[0].model_id).toBe(21))
  await act(async () => {
    pending.resolve({ ok: false, error: { code: 'invalid_response', message: 'Old round failed' } })
    await refresh
  })
  expect(hook.result.current.error).toBeNull()
  expect(hook.result.current.cached?.statistics[0].model_id).toBe(21)
})

it('deduplicates scoped requests and prevents abandoned requests from repopulating cleared caches', async () => {
  const pending = Promise.withResolvers<Result<SeasonStatisticsRefresh>>()
  const request = vi.fn(() => pending.promise)
  vi.stubGlobal('halfspace', { sportmonks: { refreshSeasonStatistics: request } })
  const hook = renderHook(() => useSeasonStatistics(1, true, 10, 20))
  let requests!: Promise<void>[]
  act(() => {
    requests = [hook.result.current.refresh(), hook.result.current.refresh()]
  })
  expect(request).toHaveBeenCalledTimes(1)
  expect(request).toHaveBeenCalledWith({ seasonId: 1, stageId: 10, roundId: 20 })
  invalidateCompetitionWorkspaceRefreshes()
  await clearSportmonksCache()
  await act(async () => {
    pending.resolve({
      ok: true,
      data: { statistics: [], stageId: 10, roundId: 20, fetchedAt: Date.now() }
    })
    await Promise.all(requests)
  })
  expect(await readSeasonStatistics(1, 10, 20)).toBeNull()
})
