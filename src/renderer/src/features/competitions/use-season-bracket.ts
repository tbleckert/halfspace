import { useCallback } from 'react'
import { readSeasonBracket, writeSeasonBracketRefresh } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let generation = 0
const requests = new Map<number, RefreshRequest>()
export function useSeasonBracket(
  seasonId: number | null,
  enabled: boolean,
  ongoing = false
): RefreshableQuery<Awaited<ReturnType<typeof readSeasonBracket>>> {
  const cached = useScopedLiveQuery(
    () => (seasonId === null ? Promise.resolve(null) : readSeasonBracket(seasonId)),
    [seasonId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(seasonId)
  const refresh = useCallback(async () => {
    if (!enabled || seasonId === null) return
    await runRefresh(
      () => refreshSeasonBracket(seasonId),
      'Could not refresh knockout progression.'
    )
  }, [enabled, seasonId, runRefresh])
  const staleAt =
    cached && ongoing ? Math.min(cached.staleAt, cached.fetchedAt + 30_000) : cached?.staleAt
  useStaleRefresh(enabled && seasonId !== null, cached !== undefined, staleAt, refresh)
  return { cached, refreshing, error, refresh }
}
export function invalidateBracketRefreshes(): void {
  generation++
  requests.clear()
}
export async function refreshSeasonBracket(seasonId: number): Promise<void> {
  const active = requests.get(seasonId)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshSeasonBracket({ seasonId })
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeSeasonBracketRefresh(seasonId, result.data)
  })()
  requests.set(seasonId, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(seasonId)?.promise === promise) requests.delete(seasonId)
  }
}
