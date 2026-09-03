import { useRefreshStatus } from '@/lib/use-refresh-status'
import { useCallback } from 'react'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { readSeasonSchedule, writeSeasonScheduleRefresh } from '@/data/db'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

type ScheduleCache = Awaited<ReturnType<typeof readSeasonSchedule>>
let generation = 0
const requests = new Map<number, RefreshRequest>()

export function useSeasonSchedule(
  seasonId: number | null,
  enabled: boolean
): RefreshableQuery<ScheduleCache> {
  const cached = useScopedLiveQuery(
    () => (seasonId === null ? Promise.resolve(null) : readSeasonSchedule(seasonId)),
    [seasonId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(seasonId)
  const refresh = useCallback(async () => {
    if (!enabled || seasonId === null) return
    await runRefresh(() => refreshSeasonSchedule(seasonId), 'Could not refresh schedule.')
  }, [enabled, seasonId, runRefresh])
  useStaleRefresh(enabled && seasonId !== null, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidateScheduleRefreshes(): void {
  generation += 1
  requests.clear()
}

export async function prefetchSeasonSchedule(seasonId: number): Promise<void> {
  const cached = await readSeasonSchedule(seasonId)
  if (cached && cached.staleAt > Date.now()) return
  await refreshSeasonSchedule(seasonId)
}

export async function refreshSeasonSchedule(seasonId: number): Promise<void> {
  const active = requests.get(seasonId)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshSeasonSchedule({ seasonId })
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeSeasonScheduleRefresh(seasonId, result.data)
  })()
  requests.set(seasonId, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(seasonId)?.promise === promise) requests.delete(seasonId)
  }
}
