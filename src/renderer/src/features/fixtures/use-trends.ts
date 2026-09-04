import { useCallback, useEffect, useRef } from 'react'
import { readFixtureTrends, writeFixtureTrendsRefresh } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let generation = 0
const requests = new Map<number, RefreshRequest>()

export function useTrends(
  fixtureId: number | null,
  enabled: boolean,
  live: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readFixtureTrends>>> {
  const cached = useScopedLiveQuery(
    () => (fixtureId === null ? Promise.resolve(null) : readFixtureTrends(fixtureId)),
    [fixtureId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(fixtureId)
  const refresh = useCallback(async () => {
    if (!enabled || fixtureId === null) return
    await runRefresh(() => refreshTrends(fixtureId), 'Could not refresh trends.')
  }, [enabled, fixtureId, runRefresh])
  const staleAt =
    live && cached ? Math.min(cached.staleAt, cached.fetchedAt + 30_000) : cached?.staleAt
  useStaleRefresh(enabled && fixtureId !== null, cached !== undefined, staleAt, refresh)
  const previous = useRef({ fixtureId, live })
  useEffect(() => {
    const matchEnded = previous.current.fixtureId === fixtureId && previous.current.live && !live
    previous.current = { fixtureId, live }
    if (matchEnded && enabled && document.visibilityState !== 'hidden') void refresh()
  }, [enabled, fixtureId, live, refresh])
  return { cached, refreshing, error, refresh }
}

export function invalidateTrendsRefreshes(): void {
  generation += 1
  requests.clear()
}

async function refreshTrends(fixtureId: number): Promise<void> {
  const active = requests.get(fixtureId)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshFixtureTrends({ fixtureId })
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeFixtureTrendsRefresh(fixtureId, result.data)
  })()
  requests.set(fixtureId, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(fixtureId)?.promise === promise) requests.delete(fixtureId)
  }
}
