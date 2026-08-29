import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  readFixtureIdentity,
  readFixtureOdds,
  readFixtureQuery,
  writeFixtureDetailRefresh,
  writeFixtureOddsRefresh,
  writeFixtureRefresh
} from '@/data/db'

interface FixtureRefreshRequest {
  generation: number
  promise: Promise<void>
}

let refreshGeneration = 0
const refreshes = new Map<string, FixtureRefreshRequest>()
const entityRefreshes = new Map<number, FixtureRefreshRequest>()
const oddsRefreshes = new Map<number, FixtureRefreshRequest>()

type FixtureCache = Awaited<ReturnType<typeof readFixtureQuery>>

interface UseFixturesResult {
  cached: FixtureCache | undefined
  refreshing: boolean
  error: string | null
  refresh: () => Promise<void>
}

type FixtureIdentityCache = Awaited<ReturnType<typeof readFixtureIdentity>>

interface UseFixtureResult {
  cached: FixtureIdentityCache | undefined
  refreshing: boolean
  error: string | null
  refresh: () => Promise<void>
}

type FixtureOddsCache = Awaited<ReturnType<typeof readFixtureOdds>>

interface UseFixtureOddsResult {
  cached: FixtureOddsCache | undefined
  refreshing: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useFixtures(date: string, timeZone: string, enabled: boolean): UseFixturesResult {
  const cached = useLiveQuery(() => readFixtureQuery(date, timeZone), [date, timeZone])
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

  const cacheLoaded = cached !== undefined
  const staleAt = cached?.query?.staleAt

  useEffect(() => {
    if (!enabled || !cacheLoaded) return

    const delay = staleAt ? Math.max(0, staleAt - Date.now()) : 0
    const timeout = window.setTimeout(() => void refresh(), delay)

    return () => window.clearTimeout(timeout)
  }, [cacheLoaded, date, enabled, refresh, staleAt, timeZone])

  return { cached, refreshing, error, refresh }
}

export function useFixtureEntity(fixtureId: number | null, enabled: boolean): UseFixtureResult {
  const cached = useLiveQuery(
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

  const cacheLoaded = cached !== undefined
  const staleAt = cached?.fixture?.detailStaleAt

  useEffect(() => {
    if (!enabled || !cacheLoaded) return

    const delay = staleAt ? Math.max(0, staleAt - Date.now()) : 0
    const timeout = window.setTimeout(() => void refresh(), delay)

    return () => window.clearTimeout(timeout)
  }, [cacheLoaded, enabled, refresh, staleAt])

  return { cached, refreshing, error, refresh }
}

export function useFixtureOdds(fixtureId: number | null, enabled: boolean): UseFixtureOddsResult {
  const cached = useLiveQuery(
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

  const cacheLoaded = cached !== undefined
  const staleAt = cached?.query?.staleAt

  useEffect(() => {
    if (!enabled || !cacheLoaded) return

    const delay = staleAt ? Math.max(0, staleAt - Date.now()) : 0
    const timeout = window.setTimeout(() => void refresh(), delay)

    return () => window.clearTimeout(timeout)
  }, [cacheLoaded, enabled, refresh, staleAt])

  return { cached, refreshing, error, refresh }
}

export async function prefetchFixtureQuery(date: string, timeZone: string): Promise<void> {
  const cached = await readFixtureQuery(date, timeZone)
  if (cached.query && cached.query.staleAt > Date.now()) return

  await refreshFixtureQuery(date, timeZone)
}

async function refreshFixtureQuery(date: string, timeZone: string): Promise<void> {
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

export function invalidateFixtureRefreshes(): void {
  refreshGeneration += 1
  refreshes.clear()
  entityRefreshes.clear()
  oddsRefreshes.clear()
}
