import { useCallback } from 'react'
import { readFixturePressure, writeFixturePressureRefresh } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let generation = 0
const requests = new Map<number, RefreshRequest>()

export function usePressure(
  fixtureId: number | null,
  enabled: boolean,
  live: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readFixturePressure>>> {
  const cached = useScopedLiveQuery(
    () => (fixtureId === null ? Promise.resolve(null) : readFixturePressure(fixtureId)),
    [fixtureId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(fixtureId)
  const refresh = useCallback(async () => {
    if (!enabled || fixtureId === null) return
    await runRefresh(() => refreshPressure(fixtureId), 'Could not refresh pressure.')
  }, [enabled, fixtureId, runRefresh])
  const staleAt =
    live && cached ? Math.min(cached.staleAt, cached.fetchedAt + 30_000) : cached?.staleAt
  useStaleRefresh(enabled && fixtureId !== null, cached !== undefined, staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidatePressureRefreshes(): void {
  generation += 1
  requests.clear()
}

async function refreshPressure(fixtureId: number): Promise<void> {
  const active = requests.get(fixtureId)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshFixturePressure({ fixtureId })
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeFixturePressureRefresh(fixtureId, result.data)
  })()
  requests.set(fixtureId, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(fixtureId)?.promise === promise) requests.delete(fixtureId)
  }
}
