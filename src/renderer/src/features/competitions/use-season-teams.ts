import { useCallback } from 'react'
import { readSeasonTeams, writeSeasonTeamsRefresh } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

type Cache = Awaited<ReturnType<typeof readSeasonTeams>>
let generation = 0
const requests = new Map<number, RefreshRequest>()

export function useSeasonTeams(seasonId: number | null, enabled: boolean): RefreshableQuery<Cache> {
  const cached = useScopedLiveQuery(
    () => (seasonId === null ? Promise.resolve(null) : readSeasonTeams(seasonId)),
    [seasonId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(seasonId)
  const refresh = useCallback(async () => {
    if (!enabled || seasonId === null) return
    await runRefresh(() => refreshSeasonTeams(seasonId), 'Could not refresh season teams.')
  }, [enabled, seasonId, runRefresh])
  useStaleRefresh(enabled && seasonId !== null, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidateSeasonTeamsRefreshes(): void {
  generation += 1
  requests.clear()
}

export async function refreshSeasonTeams(seasonId: number): Promise<void> {
  const active = requests.get(seasonId)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshSeasonTeams({ seasonId })
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeSeasonTeamsRefresh(seasonId, result.data)
  })()
  requests.set(seasonId, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(seasonId)?.promise === promise) requests.delete(seasonId)
  }
}
