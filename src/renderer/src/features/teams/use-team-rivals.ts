import { useCallback, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { readTeamRivals, writeTeamRivalsRefresh } from '@/data/db'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

type RivalsCache = Awaited<ReturnType<typeof readTeamRivals>>
let generation = 0
const requests = new Map<number, RefreshRequest>()

export function useTeamRivals(
  teamId: number | null,
  enabled: boolean
): RefreshableQuery<RivalsCache> {
  const result = useLiveQuery(
    () => (teamId === null ? Promise.resolve(null) : readTeamRivals(teamId)),
    [teamId]
  )
  const cached = result && result.teamId !== teamId ? undefined : result
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    if (!enabled || teamId === null) return
    setRefreshing(true)
    setError(null)
    try {
      await refreshTeamRivals(teamId)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not refresh rivals.')
    } finally {
      setRefreshing(false)
    }
  }, [enabled, teamId])
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
