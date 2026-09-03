import { useRefreshStatus } from '@/lib/use-refresh-status'
import { useCallback } from 'react'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { readFixtureCommentary, writeFixtureCommentaryRefresh } from '@/data/db'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

type CommentaryCache = Awaited<ReturnType<typeof readFixtureCommentary>>
let generation = 0
const requests = new Map<number, RefreshRequest>()

export function useCommentary(
  fixtureId: number | null,
  enabled: boolean,
  live: boolean
): RefreshableQuery<CommentaryCache> {
  const cached = useScopedLiveQuery(
    () => (fixtureId === null ? Promise.resolve(null) : readFixtureCommentary(fixtureId)),
    [fixtureId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(fixtureId)
  const refresh = useCallback(async () => {
    if (!enabled || fixtureId === null) return
    await runRefresh(() => refreshCommentary(fixtureId), 'Could not refresh commentary.')
  }, [enabled, fixtureId, runRefresh])
  const staleAt =
    live && cached ? Math.min(cached.staleAt, cached.fetchedAt + 30_000) : cached?.staleAt
  useStaleRefresh(enabled && fixtureId !== null, cached !== undefined, staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidateCommentaryRefreshes(): void {
  generation += 1
  requests.clear()
}

export async function refreshCommentary(fixtureId: number): Promise<void> {
  const active = requests.get(fixtureId)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshFixtureCommentary({ fixtureId })
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeFixtureCommentaryRefresh(fixtureId, result.data)
  })()
  requests.set(fixtureId, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(fixtureId)?.promise === promise) requests.delete(fixtureId)
  }
}
