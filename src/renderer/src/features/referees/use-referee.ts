import { useCallback, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { readRefereeIdentity, writeRefereeRefresh } from '@/data/db'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

type RefereeCache = Awaited<ReturnType<typeof readRefereeIdentity>>
let refreshGeneration = 0
const refereeRefreshes = new Map<number, RefreshRequest>()

export function useRefereeEntity(
  refereeId: number | null,
  enabled: boolean
): RefreshableQuery<RefereeCache> {
  const result = useLiveQuery(
    () =>
      refereeId === null
        ? Promise.resolve({ referee: null, appointments: [] })
        : readRefereeIdentity(refereeId),
    [refereeId]
  )
  const cached = result?.referee && result.referee.id !== refereeId ? undefined : result
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    if (!enabled || refereeId === null) return
    setRefreshing(true)
    setError(null)
    try {
      await refreshRefereeEntity(refereeId)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not refresh referee.')
    } finally {
      setRefreshing(false)
    }
  }, [refereeId, enabled])
  useStaleRefresh(
    enabled && refereeId !== null,
    cached !== undefined,
    cached?.referee?.staleAt,
    refresh
  )
  return { cached, refreshing, error, refresh }
}

export function invalidateRefereeRefreshes(): void {
  refreshGeneration += 1
  refereeRefreshes.clear()
}

export async function prefetchRefereeEntity(refereeId: number): Promise<void> {
  const cached = await readRefereeIdentity(refereeId)
  if (cached.referee?.detailed && cached.referee.staleAt > Date.now()) return
  await refreshRefereeEntity(refereeId)
}

export async function refreshRefereeEntity(refereeId: number): Promise<void> {
  const active = refereeRefreshes.get(refereeId)
  if (active?.generation === refreshGeneration) return active.promise
  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshReferee({ refereeId })
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writeRefereeRefresh(result.data)
  })()
  refereeRefreshes.set(refereeId, { generation, promise })
  try {
    await promise
  } finally {
    if (refereeRefreshes.get(refereeId)?.promise === promise) refereeRefreshes.delete(refereeId)
  }
}
