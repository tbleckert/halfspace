import { useRefreshStatus } from '@/lib/use-refresh-status'
import { useCallback } from 'react'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { readRefereeIdentity, writeRefereeRefresh } from '@/data/db'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

type RefereeCache = Awaited<ReturnType<typeof readRefereeIdentity>>
let refreshGeneration = 0
const refereeRefreshes = new Map<number, RefreshRequest>()

export function useRefereeEntity(
  refereeId: number | null,
  enabled: boolean
): RefreshableQuery<RefereeCache> {
  const cached = useScopedLiveQuery(
    () =>
      refereeId === null
        ? Promise.resolve({ referee: null, appointments: [] })
        : readRefereeIdentity(refereeId),
    [refereeId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(refereeId)
  const refresh = useCallback(async () => {
    if (!enabled || refereeId === null) return
    await runRefresh(() => refreshRefereeEntity(refereeId), 'Could not refresh referee.')
  }, [refereeId, enabled, runRefresh])
  useStaleRefresh(
    enabled && refereeId !== null,
    cached !== undefined,
    cached?.referee?.staleAt,
    refresh
  )
  return { cached, refreshing, error, refresh }
}

export function invalidateRefereeRefreshes(): void {
  refreshGeneration += 1
  refereeRefreshes.clear()
}

export async function prefetchRefereeEntity(refereeId: number): Promise<void> {
  const cached = await readRefereeIdentity(refereeId)
  if (cached.referee?.detailed && cached.referee.staleAt > Date.now()) return
  await refreshRefereeEntity(refereeId)
}

export async function refreshRefereeEntity(refereeId: number): Promise<void> {
  const active = refereeRefreshes.get(refereeId)
  if (active?.generation === refreshGeneration) return active.promise
  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshReferee({ refereeId })
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writeRefereeRefresh(result.data)
  })()
  refereeRefreshes.set(refereeId, { generation, promise })
  try {
    await promise
  } finally {
    if (refereeRefreshes.get(refereeId)?.promise === promise) refereeRefreshes.delete(refereeId)
  }
}
