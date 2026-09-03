import { useCallback } from 'react'
import type { OddsFeed, RefreshFixtureHeadToHeadInput } from '@shared/contracts'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import {
  fixtureHeadToHeadQueryKey,
  readFixtureHeadToHead,
  readFixtureIdentity,
  readFixtureOdds,
  readFixtureQuery,
  writeFixtureDetailRefresh,
  writeFixtureHeadToHeadRefresh,
  writeFixtureOddsRefresh,
  writeFixtureRefresh,
  writeFixtureWindowRefresh
} from '@/data/db'
import { matchdayWindow } from './matchday-hub'
import { isFixtureOngoing } from '@/lib/fixture-state'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let refreshGeneration = 0
const refreshes = new Map<string, RefreshRequest>()
const windowRefreshes = new Map<string, RefreshRequest>()
const entityRefreshes = new Map<number, RefreshRequest>()
const oddsRefreshes = new Map<string, RefreshRequest>()
const headToHeadRefreshes = new Map<string, RefreshRequest>()

type FixtureCache = Awaited<ReturnType<typeof readFixtureQuery>>

type FixtureIdentityCache = Awaited<ReturnType<typeof readFixtureIdentity>>
type FixtureOddsCache = Awaited<ReturnType<typeof readFixtureOdds>>
type FixtureHeadToHeadCache = Awaited<ReturnType<typeof readFixtureHeadToHead>>

interface MatchdayWindowDay extends FixtureCache {
  date: string
}

interface MatchdayWindowCache {
  days: MatchdayWindowDay[]
  complete: boolean
  selectedStaleAt?: number
  windowStaleAt?: number
}

export function useFixtures(
  date: string,
  timeZone: string,
  enabled: boolean
): RefreshableQuery<FixtureCache> {
  const cached = useScopedLiveQuery(() => readFixtureQuery(date, timeZone), [date, timeZone])
  const { refreshing, error, runRefresh } = useRefreshStatus(`${date}|${timeZone}`)

  const refresh = useCallback(async () => {
    if (!enabled) return

    await runRefresh(() => refreshFixtureQuery(date, timeZone), 'Could not refresh fixtures.')
  }, [date, enabled, timeZone, runRefresh])

  useStaleRefresh(enabled, cached !== undefined, cached?.query?.staleAt, refresh)

  return { cached, refreshing, error, refresh }
}

export function useMatchdayWindow(
  date: string,
  timeZone: string,
  enabled: boolean
): RefreshableQuery<MatchdayWindowCache> {
  const fixtureWindow = matchdayWindow(date)
  const cached = useScopedLiveQuery(async () => {
    const days = await Promise.all(
      fixtureWindow.dates.map(async (windowDate) => ({
        date: windowDate,
        ...(await readFixtureQuery(windowDate, timeZone))
      }))
    )
    const selectedQuery = days.find((day) => day.date === date)?.query
    const surroundingQueries = days
      .filter(
        (day) => day.date !== date && !day.fixtures.some(({ stateId }) => isFixtureOngoing(stateId))
      )
      .map(({ query }) => query)

    return {
      days,
      complete: days.every(({ query }) => query !== null),
      selectedStaleAt: selectedQuery?.staleAt,
      windowStaleAt:
        surroundingQueries.every((query) => query !== null) && surroundingQueries.length > 0
          ? Math.min(...surroundingQueries.map((query) => query.staleAt))
          : undefined
    }
  }, [date, timeZone])
  const queryKey = `${date}|${timeZone}`
  const {
    refreshing: windowRefreshing,
    error: windowError,
    runRefresh: runWindowRefresh
  } = useRefreshStatus(queryKey)
  const {
    refreshing: selectedRefreshing,
    error: selectedError,
    runRefresh: runSelectedRefresh
  } = useRefreshStatus(queryKey)

  const refresh = useCallback(async () => {
    if (!enabled) return

    await runWindowRefresh(
      () => refreshMatchdayWindow(date, timeZone),
      'Could not refresh fixtures.'
    )
  }, [date, enabled, timeZone, runWindowRefresh])

  const refreshSelected = useCallback(async () => {
    if (!enabled) return

    await runSelectedRefresh(
      () => refreshFixtureQuery(date, timeZone),
      'Could not refresh fixtures.'
    )
  }, [date, enabled, timeZone, runSelectedRefresh])

  useStaleRefresh(enabled, cached !== undefined, cached?.windowStaleAt, refresh)
  useStaleRefresh(
    enabled && cached?.days.find((day) => day.date === date)?.query !== null,
    cached !== undefined,
    cached?.selectedStaleAt,
    refreshSelected
  )

  return {
    cached,
    refreshing: windowRefreshing || selectedRefreshing,
    error: windowError ?? selectedError,
    refresh
  }
}

export function useFixtureEntity(
  fixtureId: number | null,
  enabled: boolean
): RefreshableQuery<FixtureIdentityCache> {
  const cached = useScopedLiveQuery(
    () =>
      fixtureId === null
        ? Promise.resolve({ fixture: null, competition: null })
        : readFixtureIdentity(fixtureId),
    [fixtureId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(fixtureId)

  const refresh = useCallback(async () => {
    if (!enabled || fixtureId === null) return

    await runRefresh(() => refreshFixtureEntity(fixtureId), 'Could not refresh fixture.')
  }, [enabled, fixtureId, runRefresh])

  useStaleRefresh(
    enabled && fixtureId !== null,
    cached !== undefined,
    cached?.fixture?.detailStaleAt,
    refresh
  )

  return { cached, refreshing, error, refresh }
}

export function useFixtureOdds(
  fixtureId: number | null,
  enabled: boolean,
  feed: OddsFeed,
  live: boolean
): RefreshableQuery<FixtureOddsCache> {
  const cached = useScopedLiveQuery(
    () =>
      fixtureId === null
        ? Promise.resolve({ query: null, odds: [] })
        : readFixtureOdds(fixtureId, feed),
    [fixtureId, feed]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(`${fixtureId}:${feed}`)

  const refresh = useCallback(async () => {
    if (!enabled || fixtureId === null) return

    await runRefresh(() => refreshFixtureOdds(fixtureId, feed), 'Could not refresh fixture odds.')
  }, [enabled, fixtureId, feed, runRefresh])

  useStaleRefresh(
    enabled && fixtureId !== null,
    cached !== undefined,
    feed === 'inplay' && live && cached?.query
      ? Math.min(cached.query.staleAt, cached.query.fetchedAt + 30_000)
      : cached?.query?.staleAt,
    refresh
  )

  return { cached, refreshing, error, refresh }
}

export function useFixtureHeadToHead(
  input: RefreshFixtureHeadToHeadInput | null,
  enabled: boolean
): RefreshableQuery<FixtureHeadToHeadCache> {
  const cacheKey = input ? fixtureHeadToHeadQueryKey(input) : null
  const cached = useScopedLiveQuery(
    () =>
      input === null
        ? Promise.resolve({ query: null, fixtures: [] })
        : readFixtureHeadToHead(input),
    [cacheKey]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(cacheKey)

  const refresh = useCallback(async () => {
    if (!enabled || input === null) return

    await runRefresh(() => refreshFixtureHeadToHead(input), 'Could not refresh previous meetings.')
  }, [enabled, input, runRefresh])

  useStaleRefresh(enabled && input !== null, cached !== undefined, cached?.query?.staleAt, refresh)

  return { cached, refreshing, error, refresh }
}

export async function prefetchFixtureQuery(date: string, timeZone: string): Promise<void> {
  const cached = await readFixtureQuery(date, timeZone)
  if (cached.query && cached.query.staleAt > Date.now()) return

  await refreshFixtureQuery(date, timeZone)
}

export async function prefetchMatchdayWindow(date: string, timeZone: string): Promise<void> {
  const fixtureWindow = matchdayWindow(date)
  const cached = await Promise.all(
    fixtureWindow.dates.map((windowDate) => readFixtureQuery(windowDate, timeZone))
  )
  if (cached.every(({ query }) => query && query.staleAt > Date.now())) return

  await refreshMatchdayWindow(date, timeZone)
}

export async function prefetchFixtureEntity(fixtureId: number): Promise<void> {
  const cached = await readFixtureIdentity(fixtureId)
  if (cached.fixture?.detailStaleAt && cached.fixture.detailStaleAt > Date.now()) return

  await refreshFixtureEntity(fixtureId)
}

export async function prefetchFixtureHeadToHead(
  input: RefreshFixtureHeadToHeadInput
): Promise<void> {
  const cached = await readFixtureHeadToHead(input)
  if (cached.query && cached.query.staleAt > Date.now()) return

  await refreshFixtureHeadToHead(input)
}

export async function refreshFixtureQuery(date: string, timeZone: string): Promise<void> {
  const key = `${date}|${timeZone}`
  const existing = refreshes.get(key)
  if (existing?.generation === refreshGeneration) return existing.promise

  const generation = refreshGeneration

  const refresh = (async () => {
    const result = await window.halfspace.sportmonks.refreshFixtures({ date, timeZone })

    if (generation !== refreshGeneration) return

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    await writeFixtureRefresh(date, timeZone, result.data)
  })()

  refreshes.set(key, { generation, promise: refresh })

  try {
    await refresh
  } finally {
    if (refreshes.get(key)?.promise === refresh) refreshes.delete(key)
  }
}

async function refreshMatchdayWindow(date: string, timeZone: string): Promise<void> {
  const fixtureWindow = matchdayWindow(date)
  const key = `${fixtureWindow.startDate}|${fixtureWindow.endDate}|${timeZone}`
  const existing = windowRefreshes.get(key)
  if (existing?.generation === refreshGeneration) return existing.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshFixtureWindow({
      startDate: fixtureWindow.startDate,
      endDate: fixtureWindow.endDate,
      timeZone
    })
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)

    await writeFixtureWindowRefresh(fixtureWindow.dates, timeZone, result.data)
  })()

  windowRefreshes.set(key, { generation, promise })

  try {
    await promise
  } finally {
    if (windowRefreshes.get(key)?.promise === promise) windowRefreshes.delete(key)
  }
}

export async function refreshFixtureEntity(fixtureId: number): Promise<void> {
  const existing = entityRefreshes.get(fixtureId)
  if (existing?.generation === refreshGeneration) return existing.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshFixture({ fixtureId })
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writeFixtureDetailRefresh(result.data)
  })()

  entityRefreshes.set(fixtureId, { generation, promise })

  try {
    await promise
  } finally {
    if (entityRefreshes.get(fixtureId)?.promise === promise) entityRefreshes.delete(fixtureId)
  }
}

async function refreshFixtureOdds(fixtureId: number, feed: OddsFeed): Promise<void> {
  const key = `${fixtureId}:${feed}`
  const existing = oddsRefreshes.get(key)
  if (existing?.generation === refreshGeneration) return existing.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshFixtureOdds({ fixtureId, feed })
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writeFixtureOddsRefresh(fixtureId, feed, result.data)
  })()

  oddsRefreshes.set(key, { generation, promise })

  try {
    await promise
  } finally {
    if (oddsRefreshes.get(key)?.promise === promise) oddsRefreshes.delete(key)
  }
}

async function refreshFixtureHeadToHead(input: RefreshFixtureHeadToHeadInput): Promise<void> {
  const key = fixtureHeadToHeadQueryKey(input)
  const existing = headToHeadRefreshes.get(key)
  if (existing?.generation === refreshGeneration) return existing.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshFixtureHeadToHead(input)
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writeFixtureHeadToHeadRefresh(input, result.data)
  })()

  headToHeadRefreshes.set(key, { generation, promise })

  try {
    await promise
  } finally {
    if (headToHeadRefreshes.get(key)?.promise === promise) headToHeadRefreshes.delete(key)
  }
}

export function invalidateFixtureRefreshes(): void {
  refreshGeneration += 1
  refreshes.clear()
  windowRefreshes.clear()
  entityRefreshes.clear()
  oddsRefreshes.clear()
  headToHeadRefreshes.clear()
}
