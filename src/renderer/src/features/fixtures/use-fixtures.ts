import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { readFixtureQuery, writeFixtureRefresh } from '@/data/db'

interface FixtureRefreshRequest {
  generation: number
  promise: Promise<void>
}

let refreshGeneration = 0
const refreshes = new Map<string, FixtureRefreshRequest>()

type FixtureCache = Awaited<ReturnType<typeof readFixtureQuery>>

interface UseFixturesResult {
  cached: FixtureCache | undefined
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

export function invalidateFixtureRefreshes(): void {
  refreshGeneration += 1
  refreshes.clear()
}
