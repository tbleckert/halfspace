import { useRefreshStatus } from '@/lib/use-refresh-status'
import { useCallback } from 'react'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { readTeamRivals, writeTeamRivalsRefresh } from '@/data/db'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

type RivalsCache = Awaited<ReturnType<typeof readTeamRivals>>
let generation = 0
const requests = new Map<number, RefreshRequest>()

export function useTeamRivals(
  teamId: number | null,
  enabled: boolean
): RefreshableQuery<RivalsCache> {
  const cached = useScopedLiveQuery(
    () => (teamId === null ? Promise.resolve(null) : readTeamRivals(teamId)),
    [teamId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(teamId)
  const refresh = useCallback(async () => {
    if (!enabled || teamId === null) return
    await runRefresh(() => refreshTeamRivals(teamId), 'Could not refresh rivals.')
  }, [enabled, teamId, runRefresh])
  useStaleRefresh(enabled && teamId !== null, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidateRivalRefreshes(): void {
  generation += 1
  requests.clear()
}

export async function refreshTeamRivals(teamId: number): Promise<void> {
  const active = requests.get(teamId)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshTeamRivals({ teamId })
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeTeamRivalsRefresh(teamId, result.data)
  })()
  requests.set(teamId, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(teamId)?.promise === promise) requests.delete(teamId)
  }
}
