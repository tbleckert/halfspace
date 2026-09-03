// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  readFixtureTv,
  readSubscription,
  readTeamOfWeek,
  writeTeamOfWeekRefresh
} from '@/data/db'
import { invalidateFixtureTvRefreshes, useFixtureTv } from '@/features/fixtures/use-fixture-tv'
import {
  invalidateTeamOfWeekRefreshes,
  useTeamOfWeek
} from '@/features/competitions/use-team-of-week'
import { invalidateSubscriptionRefresh, useSubscription } from './use-subscription'

beforeEach(async () => {
  invalidateSubscriptionRefresh()
  invalidateFixtureTvRefreshes()
  invalidateTeamOfWeekRefreshes()
  await clearSportmonksCache()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.close())

it.each([
  {
    name: 'subscription',
    method: 'refreshSubscription',
    useQuery: () => useSubscription(true),
    invalidate: invalidateSubscriptionRefresh,
    read: readSubscription,
    data: { plans: [], addOns: [], resources: [], enrichments: [], fetchedAt: 1000 }
  },
  {
    name: 'TV guide',
    method: 'refreshFixtureTv',
    useQuery: () => useFixtureTv(10, true),
    invalidate: invalidateFixtureTvRefreshes,
    read: () => readFixtureTv(10),
    data: { listings: [], fetchedAt: 1000 }
  },
  {
    name: 'Team of the Week',
    method: 'refreshTeamOfWeek',
    useQuery: () => useTeamOfWeek({ competitionId: 8 }, true),
    invalidate: invalidateTeamOfWeekRefreshes,
    read: () => readTeamOfWeek({ competitionId: 8 }),
    data: { entries: [], fetchedAt: 1000 }
  }
])(
  'does not restore a pending $name response after credentials change',
  async ({ method, useQuery, invalidate, read, data }) => {
    let resolve!: (value: unknown) => void
    const pending = new Promise((done) => {
      resolve = done
    })
    const refresh = vi.fn().mockReturnValue(pending)
    vi.stubGlobal('halfspace', { sportmonks: { [method]: refresh } })
    const { unmount } = renderHook(() => useQuery())
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    unmount()
    invalidate()
    await act(async () => {
      resolve({ ok: true, data })
      await pending
    })
    expect(await read()).toBeNull()
  }
)

it('switches cached Team of the Week rounds without showing the previous query', async () => {
  await writeTeamOfWeekRefresh({ competitionId: 8 }, { entries: [], fetchedAt: 1000 })
  await writeTeamOfWeekRefresh({ competitionId: 8, roundId: 5 }, { entries: [], fetchedAt: 2000 })
  const { result, rerender } = renderHook(
    ({ roundId }: { roundId?: number }) => useTeamOfWeek({ competitionId: 8, roundId }, false),
    { initialProps: {} }
  )
  await waitFor(() => expect(result.current.cached?.fetchedAt).toBe(1000))
  rerender({ roundId: 5 })
  expect(result.current.cached?.fetchedAt).not.toBe(1000)
  await waitFor(() => expect(result.current.cached?.fetchedAt).toBe(2000))
})
