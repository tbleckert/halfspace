import { useCallback } from 'react'
import { readFixtureTv, writeFixtureTvRefresh } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let generation = 0
const requests = new Map<number, RefreshRequest>()

export function useFixtureTv(
  fixtureId: number,
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readFixtureTv>>> {
  const cached = useScopedLiveQuery(() => readFixtureTv(fixtureId), [fixtureId])
  const { refreshing, error, runRefresh } = useRefreshStatus(fixtureId)
  const refresh = useCallback(async () => {
    if (!enabled) return
    await runRefresh(() => refreshFixtureTv(fixtureId), 'Could not refresh TV listings.')
  }, [enabled, fixtureId, runRefresh])
  useStaleRefresh(enabled, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidateFixtureTvRefreshes(): void {
  generation += 1
  requests.clear()
}

async function refreshFixtureTv(fixtureId: number): Promise<void> {
  const active = requests.get(fixtureId)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshFixtureTv({ fixtureId })
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeFixtureTvRefresh(fixtureId, result.data)
  })()
  requests.set(fixtureId, { generation, promise })
  try {
    await promise
  } finally {
    if (requests.get(fixtureId)?.promise === promise) requests.delete(fixtureId)
  }
}
