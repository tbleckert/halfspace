import { useCallback } from 'react'
import type { TeamSeasonsInput } from '@shared/discovery'
import { readTeamSeasons, writeTeamSeasons } from '@/data/discovery-cache'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { useStaleRefresh, type RefreshableQuery, type RefreshRequest } from '@/lib/refresh'

let generation = 0
const requests = new Map<string, RefreshRequest>()
export function useTeamSeasons(
  input: TeamSeasonsInput | null,
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readTeamSeasons>> | null> {
  const key = input ? String(input.teamId) : null
  const cached = useScopedLiveQuery(
    () => (input ? readTeamSeasons(input) : Promise.resolve(null)),
    [key]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(key)
  const refresh = useCallback(async () => {
    if (!input || !enabled) return
    await runRefresh(() => refreshTeamSeasons(input), 'Could not refresh seasons.')
  }, [input, enabled, runRefresh])
  useStaleRefresh(enabled && input !== null, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}
export async function prefetchTeamSeasons(input: TeamSeasonsInput): Promise<void> {
  const started = generation
  const cached = await readTeamSeasons(input)
  if (started !== generation) return
  if ((cached?.staleAt ?? 0) > Date.now()) return
  await refreshTeamSeasons(input)
}
async function refreshTeamSeasons(input: TeamSeasonsInput): Promise<void> {
  const key = String(input.teamId)
  const active = requests.get(key)
  if (active?.generation === generation) return active.promise
  const started = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshTeamSeasons(input)
    if (started !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeTeamSeasons(input, result.data)
  })()
  requests.set(key, { generation, promise })
  try {
    await promise
  } finally {
    if (requests.get(key)?.promise === promise) requests.delete(key)
  }
}
export function invalidateTeamSeasonsRefreshes(): void {
  generation++
  requests.clear()
}
