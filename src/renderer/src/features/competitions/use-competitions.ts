import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  readCompetitionCatalog,
  setCompetitionPinned,
  writeCompetitionRefresh
} from '@/data/db'

interface CompetitionRefreshRequest {
  generation: number
  promise: Promise<void>
}

let refreshGeneration = 0
let activeRefresh: CompetitionRefreshRequest | null = null

type CompetitionCache = Awaited<ReturnType<typeof readCompetitionCatalog>>

interface UseCompetitionsResult {
  cached: CompetitionCache | undefined
  refreshing: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useCompetitions(enabled = true): UseCompetitionsResult {
  const cached = useLiveQuery(() => readCompetitionCatalog(), [])
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) return

    setRefreshing(true)
    setError(null)

    try {
      await refreshCompetitionCatalog()
    } catch (refreshError) {
      setError(
        refreshError instanceof Error ? refreshError.message : 'Could not refresh competitions.'
      )
    } finally {
      setRefreshing(false)
    }
  }, [enabled])

  const cacheLoaded = cached !== undefined
  const staleAt = cached?.catalog?.staleAt

  useEffect(() => {
    if (!enabled || !cacheLoaded) return

    const delay = staleAt ? Math.max(0, staleAt - Date.now()) : 0
    const timeout = window.setTimeout(() => void refresh(), delay)

    return () => window.clearTimeout(timeout)
  }, [cacheLoaded, enabled, refresh, staleAt])

  return { cached, refreshing, error, refresh }
}

export function usePinnedCompetitionIds(): number[] | undefined {
  return useLiveQuery(async () => {
    const pins = await db.competitionPins.orderBy('pinnedAt').toArray()
    return pins.map(({ competitionId }) => competitionId)
  }, [])
}

export async function toggleCompetitionPin(
  competitionId: number,
  pinnedCompetitionIds: readonly number[]
): Promise<void> {
  await setCompetitionPinned(competitionId, !pinnedCompetitionIds.includes(competitionId))
}

export function invalidateCompetitionRefresh(): void {
  refreshGeneration += 1
  activeRefresh = null
}

export async function refreshCompetitionCatalog(): Promise<void> {
  if (activeRefresh?.generation === refreshGeneration) return activeRefresh.promise

  const generation = refreshGeneration

  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshCompetitions()

    if (generation !== refreshGeneration) return

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    await writeCompetitionRefresh(result.data)
  })()
  activeRefresh = { generation, promise }

  try {
    await promise
  } finally {
    if (activeRefresh?.promise === promise) activeRefresh = null
  }
}
