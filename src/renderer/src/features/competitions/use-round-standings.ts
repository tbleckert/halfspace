import { useCallback } from 'react'
import type { RefreshRoundStandingsInput } from '@shared/contracts'
import { readRoundStandings, roundStandingsQueryKey, writeRoundStandingsRefresh } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let generation = 0
const requests = new Map<string, RefreshRequest>()

export function useRoundStandings(
  input: RefreshRoundStandingsInput | null,
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readRoundStandings>>> {
  const key = input ? roundStandingsQueryKey(input) : null
  const cached = useScopedLiveQuery(
    () => (input ? readRoundStandings(input) : Promise.resolve(null)),
    [key]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(key)
  const refresh = useCallback(async () => {
    if (!enabled || !input) return
    await runRefresh(() => refreshRoundStandings(input), 'Could not refresh round standings.')
  }, [enabled, input, runRefresh])
  useStaleRefresh(enabled && input !== null, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidateRoundStandingsRefreshes(): void {
  generation += 1
  requests.clear()
}

export async function refreshRoundStandings(input: RefreshRoundStandingsInput): Promise<void> {
  const key = roundStandingsQueryKey(input)
  const active = requests.get(key)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshRoundStandings(input)
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeRoundStandingsRefresh(input, result.data)
  })()
  requests.set(key, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(key)?.promise === promise) requests.delete(key)
  }
}
