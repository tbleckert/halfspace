import { useCallback } from 'react'
import type { RefreshTransferFeedInput } from '@shared/contracts'
import { readTransferFeed, transferFeedQueryKey, writeTransferFeedRefresh } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let generation = 0
const requests = new Map<string, RefreshRequest>()

export function useTransferFeed(
  input: RefreshTransferFeedInput,
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readTransferFeed>>> {
  const key = transferFeedQueryKey(input)
  const cached = useScopedLiveQuery(() => readTransferFeed(input), [key])
  const { refreshing, error, runRefresh } = useRefreshStatus(key)
  const refresh = useCallback(async () => {
    if (!enabled) return
    await runRefresh(() => refreshTransferFeed(input), 'Could not refresh transfers.')
  }, [enabled, input, runRefresh])
  useStaleRefresh(enabled, cached !== undefined, cached?.query?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidateTransferFeedRefreshes(): void {
  generation += 1
  requests.clear()
}

export async function refreshTransferFeed(input: RefreshTransferFeedInput): Promise<void> {
  const key = transferFeedQueryKey(input)
  const active = requests.get(key)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshTransferFeed(input)
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeTransferFeedRefresh(input, result.data)
  })()
  requests.set(key, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(key)?.promise === promise) requests.delete(key)
  }
}
