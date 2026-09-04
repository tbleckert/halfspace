import { useCallback } from 'react'
import { readCompetitionDetail, writeCompetitionDetailRefresh } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

type Cache = Awaited<ReturnType<typeof readCompetitionDetail>>
let generation = 0
const requests = new Map<number, RefreshRequest>()

export function useCompetitionDetail(
  competitionId: number | null,
  enabled: boolean
): RefreshableQuery<Cache> {
  const cached = useScopedLiveQuery(
    () =>
      competitionId === null
        ? Promise.resolve({ competition: null, query: null })
        : readCompetitionDetail(competitionId),
    [competitionId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(competitionId)
  const refresh = useCallback(async () => {
    if (!enabled || competitionId === null) return
    await runRefresh(
      () => refreshCompetitionDetail(competitionId),
      'Could not refresh competition.'
    )
  }, [enabled, competitionId, runRefresh])
  useStaleRefresh(
    enabled && competitionId !== null,
    cached !== undefined,
    cached?.query?.staleAt,
    refresh
  )
  return { cached, refreshing, error, refresh }
}

export function invalidateCompetitionDetailRefreshes(): void {
  generation += 1
  requests.clear()
}

export async function refreshCompetitionDetail(competitionId: number): Promise<void> {
  const active = requests.get(competitionId)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshCompetition({ competitionId })
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeCompetitionDetailRefresh(competitionId, result.data)
  })()
  requests.set(competitionId, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(competitionId)?.promise === promise) requests.delete(competitionId)
  }
}
