import { useCallback } from 'react'
import type { RefreshBroadcastScheduleInput } from '@shared/contracts'
import {
  readBroadcastSchedule,
  broadcastScheduleQueryKey,
  writeBroadcastScheduleRefresh
} from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let generation = 0
const requests = new Map<string, RefreshRequest>()

export function useBroadcastSchedule(
  input: RefreshBroadcastScheduleInput | null,
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readBroadcastSchedule>>> {
  const key = input ? broadcastScheduleQueryKey(input) : null
  const cached = useScopedLiveQuery(
    () => (input ? readBroadcastSchedule(input) : Promise.resolve(null)),
    [key]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(key)
  const refresh = useCallback(async () => {
    if (!enabled || !input) return
    await runRefresh(() => refreshBroadcastSchedule(input), 'Could not refresh broadcast schedule.')
  }, [enabled, input, runRefresh])
  useStaleRefresh(enabled && input !== null, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidateBroadcastScheduleRefreshes(): void {
  generation += 1
  requests.clear()
}

export async function refreshBroadcastSchedule(
  input: RefreshBroadcastScheduleInput
): Promise<void> {
  const key = broadcastScheduleQueryKey(input)
  const active = requests.get(key)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshBroadcastSchedule(input)
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeBroadcastScheduleRefresh(input, result.data)
  })()
  requests.set(key, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(key)?.promise === promise) requests.delete(key)
  }
}
