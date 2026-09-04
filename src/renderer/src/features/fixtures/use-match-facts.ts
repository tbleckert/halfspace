import { useCallback } from 'react'
import { readMatchFacts, writeMatchFactsRefresh } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'
let generation = 0
const requests = new Map<number, RefreshRequest>()
export function useMatchFacts(
  fixtureId: number,
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readMatchFacts>>> {
  const cached = useScopedLiveQuery(() => readMatchFacts(fixtureId), [fixtureId])
  const { refreshing, error, runRefresh } = useRefreshStatus(fixtureId)
  const refresh = useCallback(async () => {
    if (!enabled) return
    await runRefresh(() => refreshMatchFacts(fixtureId), 'Could not refresh match facts.')
  }, [fixtureId, enabled, runRefresh])
  useStaleRefresh(enabled, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}
export function invalidateMatchFactsRefreshes(): void {
  generation++
  requests.clear()
}
export async function refreshMatchFacts(fixtureId: number): Promise<void> {
  const active = requests.get(fixtureId)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshMatchFacts({ fixtureId })
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeMatchFactsRefresh(fixtureId, result.data)
  })()
  requests.set(fixtureId, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(fixtureId)?.promise === promise) requests.delete(fixtureId)
  }
}
