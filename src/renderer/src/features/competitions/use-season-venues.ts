import { useCallback } from 'react'
import { readSeasonVenues, writeSeasonVenuesRefresh } from '@/data/season-resources-cache'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let generation = 0
const requests = new Map<number, RefreshRequest>()

export function useSeasonVenues(
  seasonId: number | null,
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readSeasonVenues>>> {
  const cached = useScopedLiveQuery(
    () => (seasonId === null ? Promise.resolve(null) : readSeasonVenues(seasonId)),
    [seasonId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(seasonId)
  const refresh = useCallback(async () => {
    if (!enabled || seasonId === null) return
    await runRefresh(() => refreshSeasonVenues(seasonId), 'Could not refresh season venues.')
  }, [seasonId, enabled, runRefresh])
  useStaleRefresh(enabled && seasonId !== null, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidateSeasonVenuesRefreshes(): void {
  generation++
  requests.clear()
}

export async function prefetchSeasonVenues(seasonId: number): Promise<void> {
  const cached = await readSeasonVenues(seasonId)
  if (cached && cached.staleAt > Date.now()) return
  await refreshSeasonVenues(seasonId)
}

export async function refreshSeasonVenues(seasonId: number): Promise<void> {
  const key = seasonId
  const active = requests.get(key)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshSeasonVenues({ seasonId })
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeSeasonVenuesRefresh(seasonId, result.data)
  })()
  requests.set(key, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(key)?.promise === promise) requests.delete(key)
  }
}
