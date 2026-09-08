import { useCallback, useEffect, useRef } from 'react'
import { readFixtureExpectedMetrics, writeFixtureExpectedMetricsRefresh } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let generation = 0
const requests = new Map<number, RefreshRequest>()

export function useExpectedMetrics(
  fixtureId: number | null,
  enabled: boolean,
  live: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readFixtureExpectedMetrics>>> {
  const cached = useScopedLiveQuery(
    () => (fixtureId === null ? Promise.resolve(null) : readFixtureExpectedMetrics(fixtureId)),
    [fixtureId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(fixtureId)
  const refresh = useCallback(async () => {
    if (!enabled || fixtureId === null) return
    await runRefresh(() => refreshExpectedMetrics(fixtureId), 'Could not refresh expected metrics.')
  }, [enabled, fixtureId, runRefresh])
  const staleAt =
    live && cached ? Math.min(cached.staleAt, cached.fetchedAt + 30_000) : cached?.staleAt
  useStaleRefresh(enabled && fixtureId !== null, cached !== undefined, staleAt, refresh)
  const previous = useRef({ fixtureId, live, finalRefreshPending: false })
  useEffect(() => {
    const sameFixture = previous.current.fixtureId === fixtureId
    const finalRefreshPending =
      sameFixture && (previous.current.finalRefreshPending || (previous.current.live && !live))
    previous.current = { fixtureId, live, finalRefreshPending }
    if (!finalRefreshPending) return

    function refreshFinalReading(): void {
      if (
        !enabled ||
        !navigator.onLine ||
        document.visibilityState === 'hidden' ||
        !previous.current.finalRefreshPending
      )
        return
      previous.current.finalRefreshPending = false
      void refresh()
    }
    refreshFinalReading()
    window.addEventListener('online', refreshFinalReading)
    document.addEventListener('visibilitychange', refreshFinalReading)
    return () => {
      window.removeEventListener('online', refreshFinalReading)
      document.removeEventListener('visibilitychange', refreshFinalReading)
    }
  }, [enabled, fixtureId, live, refresh])
  return { cached, refreshing, error, refresh }
}

export function invalidateExpectedMetricsRefreshes(): void {
  generation += 1
  requests.clear()
}

async function refreshExpectedMetrics(fixtureId: number): Promise<void> {
  const active = requests.get(fixtureId)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshFixtureExpectedMetrics({ fixtureId })
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeFixtureExpectedMetricsRefresh(fixtureId, result.data)
  })()
  requests.set(fixtureId, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(fixtureId)?.promise === promise) requests.delete(fixtureId)
  }
}
