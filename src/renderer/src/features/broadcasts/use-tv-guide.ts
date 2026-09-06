import { useCallback } from 'react'
import type { RefreshFixtureWindowInput } from '@shared/contracts'
import { readTvGuide, tvGuideQueryKey, writeTvGuideRefresh } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let generation = 0
const requests = new Map<string, RefreshRequest>()

export function useTvGuide(
  input: RefreshFixtureWindowInput | null,
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readTvGuide>>> {
  const key = input ? tvGuideQueryKey(input) : null
  const cached = useScopedLiveQuery(
    () => (input ? readTvGuide(input) : Promise.resolve(null)),
    [key]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(key)
  const refresh = useCallback(async () => {
    if (!enabled || !input) return
    await runRefresh(() => refreshTvGuide(input), 'Could not refresh TV guide.')
  }, [enabled, input, runRefresh])
  useStaleRefresh(enabled && input !== null, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidateTvGuideRefreshes(): void {
  generation += 1
  requests.clear()
}

export async function refreshTvGuide(input: RefreshFixtureWindowInput): Promise<void> {
  const key = tvGuideQueryKey(input)
  const active = requests.get(key)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshTvGuide(input)
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeTvGuideRefresh(input, result.data)
  })()
  requests.set(key, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(key)?.promise === promise) requests.delete(key)
  }
}
