import { useCallback } from 'react'
import type { RefreshTransferRumoursInput } from '@shared/transfer-rumours'
import {
  readTransferRumours,
  writeTransferRumoursRefresh,
  transferRumoursQueryKey
} from '@/data/transfer-rumours-cache'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let generation = 0
const requests = new Map<string, RefreshRequest>()

export function useTransferRumours(
  input: RefreshTransferRumoursInput | null,
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readTransferRumours>>> {
  const key = input === null ? null : transferRumoursQueryKey(input)
  const cached = useScopedLiveQuery(
    () => (input === null ? Promise.resolve(null) : readTransferRumours(input)),
    [key]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(key)
  const refresh = useCallback(async () => {
    if (!enabled || input === null) return
    await runRefresh(() => refreshTransferRumours(input), 'Could not refresh transfer rumours.')
  }, [input, enabled, runRefresh])
  useStaleRefresh(enabled && input !== null, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidateTransferRumoursRefreshes(): void {
  generation++
  requests.clear()
}

export async function prefetchTransferRumours(input: RefreshTransferRumoursInput): Promise<void> {
  const cached = await readTransferRumours(input)
  if (cached && cached.staleAt > Date.now()) return
  await refreshTransferRumours(input)
}

export async function refreshTransferRumours(input: RefreshTransferRumoursInput): Promise<void> {
  const key = transferRumoursQueryKey(input)
  const active = requests.get(key)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshTransferRumours(input)
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeTransferRumoursRefresh(input, result.data)
  })()
  requests.set(key, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(key)?.promise === promise) requests.delete(key)
  }
}
