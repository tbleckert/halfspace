import { useCallback, useState } from 'react'
import type { RefreshFixtureHeadToHeadInput } from '@shared/contracts'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
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
const oddsRefreshes = new Map<number, RefreshRequest>()
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
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) return

    setRefreshing(true)
    setError(null)

    try {
      await refreshFixtureQuery(date, timeZone)
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Could not refresh fixtures.')
    } finally {
      setRefreshing(false)
    }
  }, [date, enabled, timeZone])

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
  const [windowRefreshing, setWindowRefreshing] = useState(false)
  const [selectedRefreshing, setSelectedRefreshing] = useState(false)
  const [windowError, setWindowError] = useState<string | null>(null)
  const [selectedError, setSelectedError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) return

    setWindowRefreshing(true)
    setWindowError(null)
    try {
      await refreshMatchdayWindow(date, timeZone)
    } catch (refreshError) {
      setWindowError(
        refreshError instanceof Error ? refreshError.message : 'Could not refresh fixtures.'
      )
    } finally {
      setWindowRefreshing(false)
    }
  }, [date, enabled, timeZone])

  const refreshSelected = useCallback(async () => {
    if (!enabled) return

    setSelectedRefreshing(true)
    setSelectedError(null)
    try {
      await refreshFixtureQuery(date, timeZone)
    } catch (refreshError) {
      setSelectedError(
        refreshError instanceof Error ? refreshError.message : 'Could not refresh fixtures.'
      )
    } finally {
      setSelectedRefreshing(false)
    }
  }, [date, enabled, timeZone])

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
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || fixtureId === null) return

    setRefreshing(true)
    setError(null)

    try {
      await refreshFixtureEntity(fixtureId)
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Could not refresh fixture.')
    } finally {
      setRefreshing(false)
    }
  }, [enabled, fixtureId])

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
  enabled: boolean
): RefreshableQuery<FixtureOddsCache> {
  const cached = useScopedLiveQuery(
    () =>
      fixtureId === null ? Promise.resolve({ query: null, odds: [] }) : readFixtureOdds(fixtureId),
    [fixtureId]
  )
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || fixtureId === null) return

    setRefreshing(true)
    setError(null)

    try {
      await refreshFixtureOdds(fixtureId)
    } catch (refreshError) {
      setError(
        refreshError instanceof Error ? refreshError.message : 'Could not refresh fixture odds.'
      )
    } finally {
      setRefreshing(false)
    }
  }, [enabled, fixtureId])

  useStaleRefresh(
    enabled && fixtureId !== null,
    cached !== undefined,
    cached?.query?.staleAt,
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
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || input === null) return

    setRefreshing(true)
    setError(null)

    try {
      await refreshFixtureHeadToHead(input)
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Could not refresh previous meetings.'
      )
    } finally {
      setRefreshing(false)
    }
  }, [enabled, input])

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

async function refreshFixtureOdds(fixtureId: number): Promise<void> {
  const existing = oddsRefreshes.get(fixtureId)
  if (existing?.generation === refreshGeneration) return existing.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshFixtureOdds({ fixtureId })
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writeFixtureOddsRefresh(fixtureId, result.data)
  })()

  oddsRefreshes.set(fixtureId, { generation, promise })

  try {
    await promise
  } finally {
    if (oddsRefreshes.get(fixtureId)?.promise === promise) oddsRefreshes.delete(fixtureId)
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
