import { useCallback } from 'react'
import {
  readStandingCorrections,
  writeStandingCorrectionsRefresh
} from '@/data/season-resources-cache'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let generation = 0
const requests = new Map<number, RefreshRequest>()

export function useStandingCorrections(
  seasonId: number | null,
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readStandingCorrections>>> {
  const cached = useScopedLiveQuery(
    () => (seasonId === null ? Promise.resolve(null) : readStandingCorrections(seasonId)),
    [seasonId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(seasonId)
  const refresh = useCallback(async () => {
    if (!enabled || seasonId === null) return
    await runRefresh(
      () => refreshStandingCorrections(seasonId),
      'Could not refresh standings adjustments.'
    )
  }, [seasonId, enabled, runRefresh])
  useStaleRefresh(enabled && seasonId !== null, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidateStandingCorrectionsRefreshes(): void {
  generation++
  requests.clear()
}

export async function prefetchStandingCorrections(seasonId: number): Promise<void> {
  const cached = await readStandingCorrections(seasonId)
  if (cached && cached.staleAt > Date.now()) return
  await refreshStandingCorrections(seasonId)
}

export async function refreshStandingCorrections(seasonId: number): Promise<void> {
  const key = seasonId
  const active = requests.get(key)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshStandingCorrections({ seasonId })
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeStandingCorrectionsRefresh(seasonId, result.data)
  })()
  requests.set(key, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(key)?.promise === promise) requests.delete(key)
  }
}
