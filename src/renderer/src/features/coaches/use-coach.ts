import { useCallback, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { readCoachIdentity, writeCoachRefresh } from '@/data/db'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

type CoachIdentityCache = Awaited<ReturnType<typeof readCoachIdentity>>

let refreshGeneration = 0
const coachRefreshes = new Map<number, RefreshRequest>()

export function useCoachEntity(
  coachId: number | null,
  enabled: boolean
): RefreshableQuery<CoachIdentityCache> {
  const cached = useLiveQuery(
    () =>
      coachId === null ? Promise.resolve({ coach: null, teams: [] }) : readCoachIdentity(coachId),
    [coachId]
  )
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || coachId === null) return

    setRefreshing(true)
    setError(null)

    try {
      await refreshCoachEntity(coachId)
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Could not refresh coach.')
    } finally {
      setRefreshing(false)
    }
  }, [coachId, enabled])

  useStaleRefresh(
    enabled && coachId !== null,
    cached !== undefined,
    cached?.coach?.staleAt,
    refresh
  )

  return { cached, refreshing, error, refresh }
}

export function invalidateCoachRefreshes(): void {
  refreshGeneration += 1
  coachRefreshes.clear()
}

export async function prefetchCoachEntity(coachId: number): Promise<void> {
  const cached = await readCoachIdentity(coachId)
  if (cached.coach?.detailed && cached.coach.staleAt > Date.now()) return

  await refreshCoachEntity(coachId)
}

export async function refreshCoachEntity(coachId: number): Promise<void> {
  const active = coachRefreshes.get(coachId)
  if (active?.generation === refreshGeneration) return active.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshCoach({ coachId })
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writeCoachRefresh(result.data)
  })()

  coachRefreshes.set(coachId, { generation, promise })

  try {
    await promise
  } finally {
    if (coachRefreshes.get(coachId)?.promise === promise) coachRefreshes.delete(coachId)
  }
}
