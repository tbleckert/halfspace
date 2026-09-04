// @vitest-environment jsdom
import {
  invalidateLiveStandingsRefreshes,
  useLiveStandings
} from '@/features/competitions/use-live-standings'
import { invalidateTrendsRefreshes, useTrends } from '@/features/fixtures/use-trends'
import {
  invalidateBroadcasterRefreshes,
  useBroadcaster
} from '@/features/broadcasts/use-broadcaster'
import {
  invalidateBroadcastScheduleRefreshes,
  useBroadcastSchedule
} from '@/features/broadcasts/use-broadcast-schedule'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  readLiveStandings,
  readFixtureTrends,
  readBroadcaster,
  readBroadcastSchedule,
  db,
  readFixtureTv,
  readFixturePressure,
  readSubscription,
  readTeamOfWeek,
  writeTeamOfWeekRefresh,
  writeFixturePressureRefresh
} from '@/data/db'
import { invalidateFixtureTvRefreshes, useFixtureTv } from '@/features/fixtures/use-fixture-tv'
import { invalidatePressureRefreshes, usePressure } from '@/features/fixtures/use-pressure'
import {
  invalidateTeamOfWeekRefreshes,
  useTeamOfWeek
} from '@/features/competitions/use-team-of-week'
import { invalidateSubscriptionRefresh, useSubscription } from './use-subscription'

beforeEach(async () => {
  invalidateLiveStandingsRefreshes()
  invalidateTrendsRefreshes()
  invalidateBroadcasterRefreshes()
  invalidateBroadcastScheduleRefreshes()
  invalidateSubscriptionRefresh()
  invalidateFixtureTvRefreshes()
  invalidatePressureRefreshes()
  invalidateTeamOfWeekRefreshes()
  await clearSportmonksCache()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.close())

it.each([
  {
    name: 'live standings',
    method: 'refreshLiveStandings',
    useQuery: () => useLiveStandings({ competitionId: 8, seasonId: 12 }, true, false),
    invalidate: invalidateLiveStandingsRefreshes,
    read: () => readLiveStandings({ competitionId: 8, seasonId: 12 }),
    data: { standings: [], fetchedAt: 1000 }
  },
  {
    name: 'match trends',
    method: 'refreshFixtureTrends',
    useQuery: () => useTrends(10, true, false),
    invalidate: invalidateTrendsRefreshes,
    read: () => readFixtureTrends(10),
    data: { fixtureId: 10, points: [], periods: [], fetchedAt: 1000 }
  },
  {
    name: 'broadcaster',
    method: 'refreshBroadcaster',
    useQuery: () => useBroadcaster(34, true),
    invalidate: invalidateBroadcasterRefreshes,
    read: () => readBroadcaster(34),
    data: { station: { id: 34, name: 'Station', image_path: null, url: null }, fetchedAt: 1000 }
  },
  {
    name: 'broadcast schedule',
    method: 'refreshBroadcastSchedule',
    useQuery: () => useBroadcastSchedule({ stationId: 34, feed: 'past', page: 1 }, true),
    invalidate: invalidateBroadcastScheduleRefreshes,
    read: () => readBroadcastSchedule({ stationId: 34, feed: 'past', page: 1 }),
    data: {
      stationId: 34,
      feed: 'past',
      page: 1,
      fixtures: [],
      listings: [],
      hasMore: false,
      fetchedAt: 1000
    }
  },
  {
    name: 'pressure',
    method: 'refreshFixturePressure',
    useQuery: () => usePressure(10, true, false),
    invalidate: invalidatePressureRefreshes,
    read: () => readFixturePressure(10),
    data: { points: [], fetchedAt: 1000 }
  },
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

it('switches offline pressure queries without showing another fixture or making a request', async () => {
  await writeFixturePressureRefresh(10, { points: [], fetchedAt: 1000 })
  await writeFixturePressureRefresh(11, { points: [], fetchedAt: 2000 })
  const refresh = vi.fn()
  vi.stubGlobal('halfspace', { sportmonks: { refreshFixturePressure: refresh } })
  const { result, rerender } = renderHook(({ fixtureId }) => usePressure(fixtureId, false, false), {
    initialProps: { fixtureId: 10 }
  })
  await waitFor(() => expect(result.current.cached?.fetchedAt).toBe(1000))
  rerender({ fixtureId: 11 })
  expect(result.current.cached?.fetchedAt).not.toBe(1000)
  await waitFor(() => expect(result.current.cached?.fetchedAt).toBe(2000))
  expect(refresh).not.toHaveBeenCalled()
})
