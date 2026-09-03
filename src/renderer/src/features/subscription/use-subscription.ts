import { useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { readSubscription, writeSubscriptionRefresh } from '@/data/db'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let generation = 0
let activeRefresh: RefreshRequest | null = null

export function useSubscription(
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readSubscription>>> {
  const cached = useLiveQuery(readSubscription, [])
  const { refreshing, error, runRefresh } = useRefreshStatus('subscription')
  const refresh = useCallback(async () => {
    if (!enabled) return
    await runRefresh(refreshSubscription, 'Could not refresh subscription access.')
  }, [enabled, runRefresh])
  useStaleRefresh(enabled, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidateSubscriptionRefresh(): void {
  generation += 1
  activeRefresh = null
}

async function refreshSubscription(): Promise<void> {
  if (activeRefresh?.generation === generation) return activeRefresh.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshSubscription()
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeSubscriptionRefresh(result.data)
  })()
  activeRefresh = { generation, promise }
  try {
    await promise
  } finally {
    if (activeRefresh?.promise === promise) activeRefresh = null
  }
}
