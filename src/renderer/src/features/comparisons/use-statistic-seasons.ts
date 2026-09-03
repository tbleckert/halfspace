import { useCallback } from 'react'
import type { RefreshStatisticSeasonsInput } from '@shared/contracts'
import {
  readStatisticSeasons,
  statisticSeasonsQueryKey,
  writeStatisticSeasonsRefresh
} from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

type SeasonsCache = Awaited<ReturnType<typeof readStatisticSeasons>>
let generation = 0
const requests = new Map<string, RefreshRequest>()

export function useStatisticSeasons(
  input: RefreshStatisticSeasonsInput | null,
  enabled: boolean
): RefreshableQuery<SeasonsCache> {
  const key = input ? statisticSeasonsQueryKey(input) : null
  const cached = useScopedLiveQuery(
    () => (input ? readStatisticSeasons(input) : Promise.resolve(null)),
    [key]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(key)
  const refresh = useCallback(async () => {
    if (!enabled || !input) return
    await runRefresh(() => refreshStatisticSeasons(input), 'Could not refresh available seasons.')
  }, [enabled, input, runRefresh])
  useStaleRefresh(enabled && input !== null, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidateStatisticSeasonRefreshes(): void {
  generation += 1
  requests.clear()
}

export async function refreshStatisticSeasons(input: RefreshStatisticSeasonsInput): Promise<void> {
  const key = statisticSeasonsQueryKey(input)
  const active = requests.get(key)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshStatisticSeasons(input)
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeStatisticSeasonsRefresh(input, result.data)
  })()
  requests.set(key, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(key)?.promise === promise) requests.delete(key)
  }
}
