import { useCallback, useEffect, useRef } from 'react'
import type { RefreshLiveStandingsInput } from '@shared/contracts'
import { readLiveStandings, liveStandingsQueryKey, writeLiveStandingsRefresh } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let generation = 0
const requests = new Map<string, RefreshRequest>()

export function useLiveStandings(
  input: RefreshLiveStandingsInput | null,
  enabled: boolean,
  live: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readLiveStandings>>> {
  const key = input ? liveStandingsQueryKey(input) : null
  const cached = useScopedLiveQuery(
    () => (input ? readLiveStandings(input) : Promise.resolve(null)),
    [key]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(key)
  const refresh = useCallback(async () => {
    if (!enabled || !input) return
    await runRefresh(() => refreshLiveStandings(input), 'Could not refresh live standings.')
  }, [enabled, input, runRefresh])
  const staleAt =
    live && cached ? Math.min(cached.staleAt, cached.fetchedAt + 30_000) : cached?.staleAt
  useStaleRefresh(enabled && input !== null, cached !== undefined, staleAt, refresh)
  const previous = useRef({ key, live })
  useEffect(() => {
    const matchEnded = previous.current.key === key && previous.current.live && !live
    previous.current = { key, live }
    if (matchEnded && enabled && document.visibilityState !== 'hidden') void refresh()
  }, [enabled, key, live, refresh])
  return { cached, refreshing, error, refresh }
}

export function invalidateLiveStandingsRefreshes(): void {
  generation += 1
  requests.clear()
}

export async function refreshLiveStandings(input: RefreshLiveStandingsInput): Promise<void> {
  const key = liveStandingsQueryKey(input)
  const active = requests.get(key)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshLiveStandings(input)
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeLiveStandingsRefresh(input, result.data)
  })()
  requests.set(key, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(key)?.promise === promise) requests.delete(key)
  }
}
