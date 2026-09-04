import { useCallback } from 'react'
import type { RefreshHonoursInput } from '@shared/contracts'
import { readHonours, writeHonoursRefresh, honoursQueryKey } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'
let generation = 0
const requests = new Map<string, RefreshRequest>()
export function useHonours(
  input: RefreshHonoursInput,
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readHonours>>> {
  const key = honoursQueryKey(input)
  const cached = useScopedLiveQuery(() => readHonours(input), [key])
  const { refreshing, error, runRefresh } = useRefreshStatus(key)
  const refresh = useCallback(async () => {
    if (enabled) await runRefresh(() => refreshHonours(input), 'Could not refresh honours.')
  }, [input, enabled, runRefresh])
  useStaleRefresh(enabled, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}
export function invalidateHonoursRefreshes(): void {
  generation++
  requests.clear()
}
export async function refreshHonours(input: RefreshHonoursInput): Promise<void> {
  const key = honoursQueryKey(input)
  const active = requests.get(key)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshHonours(input)
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeHonoursRefresh(input, result.data)
  })()
  requests.set(key, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(key)?.promise === promise) requests.delete(key)
  }
}
