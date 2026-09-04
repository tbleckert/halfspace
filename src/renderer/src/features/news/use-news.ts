import { useCallback } from 'react'
import type { RefreshNewsInput } from '@shared/contracts'
import { readNews, writeNewsRefresh, newsQueryKey } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'
let generation = 0
const requests = new Map<string, RefreshRequest>()
export function useNews(
  input: RefreshNewsInput,
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readNews>>> {
  const key = newsQueryKey(input)
  const cached = useScopedLiveQuery(() => readNews(input), [key])
  const { refreshing, error, runRefresh } = useRefreshStatus(key)
  const refresh = useCallback(async () => {
    if (!enabled) return
    await runRefresh(() => refreshNews(input), 'Could not refresh news.')
  }, [input, enabled, runRefresh])
  useStaleRefresh(enabled, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}
export function invalidateNewsRefreshes(): void {
  generation++
  requests.clear()
}
export async function refreshNews(input: RefreshNewsInput): Promise<void> {
  const key = newsQueryKey(input)
  const active = requests.get(key)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshNews(input)
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeNewsRefresh(input, result.data)
  })()
  requests.set(key, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(key)?.promise === promise) requests.delete(key)
  }
}
