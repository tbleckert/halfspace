import { useCallback } from 'react'
import { readTeamCompetitions, writeTeamCompetitionsRefresh } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

type Cache = Awaited<ReturnType<typeof readTeamCompetitions>>
let generation = 0
const requests = new Map<number, RefreshRequest>()

export function useTeamCompetitions(
  teamId: number | null,
  enabled: boolean
): RefreshableQuery<Cache> {
  const cached = useScopedLiveQuery(
    () => (teamId === null ? Promise.resolve(null) : readTeamCompetitions(teamId)),
    [teamId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(teamId)
  const refresh = useCallback(async () => {
    if (!enabled || teamId === null) return
    await runRefresh(
      () => refreshTeamCompetitions(teamId),
      'Could not refresh current competitions.'
    )
  }, [enabled, teamId, runRefresh])
  useStaleRefresh(enabled && teamId !== null, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidateTeamCompetitionsRefreshes(): void {
  generation += 1
  requests.clear()
}

export async function refreshTeamCompetitions(teamId: number): Promise<void> {
  const active = requests.get(teamId)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshTeamCompetitions({ teamId })
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeTeamCompetitionsRefresh(teamId, result.data)
  })()
  requests.set(teamId, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(teamId)?.promise === promise) requests.delete(teamId)
  }
}
