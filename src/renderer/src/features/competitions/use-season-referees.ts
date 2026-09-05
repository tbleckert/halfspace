import { useCallback } from 'react'
import { readSeasonReferees, writeSeasonRefereesRefresh } from '@/data/season-resources-cache'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let generation = 0
const requests = new Map<number, RefreshRequest>()

export function useSeasonReferees(
  seasonId: number | null,
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readSeasonReferees>>> {
  const cached = useScopedLiveQuery(
    () => (seasonId === null ? Promise.resolve(null) : readSeasonReferees(seasonId)),
    [seasonId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(seasonId)
  const refresh = useCallback(async () => {
    if (!enabled || seasonId === null) return
    await runRefresh(() => refreshSeasonReferees(seasonId), 'Could not refresh season referees.')
  }, [seasonId, enabled, runRefresh])
  useStaleRefresh(enabled && seasonId !== null, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidateSeasonRefereesRefreshes(): void {
  generation++
  requests.clear()
}

export async function prefetchSeasonReferees(seasonId: number): Promise<void> {
  const cached = await readSeasonReferees(seasonId)
  if (cached && cached.staleAt > Date.now()) return
  await refreshSeasonReferees(seasonId)
}

export async function refreshSeasonReferees(seasonId: number): Promise<void> {
  const key = seasonId
  const active = requests.get(key)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshSeasonReferees({ seasonId })
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeSeasonRefereesRefresh(seasonId, result.data)
  })()
  requests.set(key, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(key)?.promise === promise) requests.delete(key)
  }
}
