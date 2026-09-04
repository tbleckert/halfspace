import { useCallback } from 'react'
import { readBroadcaster, writeBroadcasterRefresh } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let generation = 0
const requests = new Map<number, RefreshRequest>()

export function useBroadcaster(
  stationId: number,
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readBroadcaster>>> {
  const cached = useScopedLiveQuery(() => readBroadcaster(stationId), [stationId])
  const { refreshing, error, runRefresh } = useRefreshStatus(stationId)
  const refresh = useCallback(async () => {
    if (!enabled) return
    await runRefresh(() => refreshBroadcaster(stationId), 'Could not refresh broadcaster.')
  }, [enabled, stationId, runRefresh])
  useStaleRefresh(enabled, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidateBroadcasterRefreshes(): void {
  generation += 1
  requests.clear()
}

async function refreshBroadcaster(stationId: number): Promise<void> {
  const active = requests.get(stationId)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshBroadcaster({ stationId })
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeBroadcasterRefresh(stationId, result.data)
  })()
  requests.set(stationId, { generation, promise })
  try {
    await promise
  } finally {
    if (requests.get(stationId)?.promise === promise) requests.delete(stationId)
  }
}
