import { useCallback } from 'react'
import type { RefreshTeamOfWeekInput } from '@shared/contracts'
import { readTeamOfWeek, teamOfWeekQueryKey, writeTeamOfWeekRefresh } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let generation = 0
const requests = new Map<string, RefreshRequest>()

export function useTeamOfWeek(
  input: RefreshTeamOfWeekInput | null,
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readTeamOfWeek>>> {
  const key = input ? teamOfWeekQueryKey(input) : null
  const competitionId = input?.competitionId
  const roundId = input?.roundId
  const cached = useScopedLiveQuery(
    () => (input ? readTeamOfWeek(input) : Promise.resolve(null)),
    [key]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(key)
  const refresh = useCallback(async () => {
    if (!enabled || competitionId === undefined) return
    await runRefresh(
      () => refreshTeamOfWeek({ competitionId, roundId }),
      'Could not refresh Team of the Week.'
    )
  }, [enabled, competitionId, roundId, runRefresh])
  useStaleRefresh(enabled && input !== null, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidateTeamOfWeekRefreshes(): void {
  generation += 1
  requests.clear()
}

async function refreshTeamOfWeek(input: RefreshTeamOfWeekInput): Promise<void> {
  const key = teamOfWeekQueryKey(input)
  const active = requests.get(key)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshTeamOfWeek(input)
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeTeamOfWeekRefresh(input, result.data)
  })()
  requests.set(key, { generation, promise })
  try {
    await promise
  } finally {
    if (requests.get(key)?.promise === promise) requests.delete(key)
  }
}
