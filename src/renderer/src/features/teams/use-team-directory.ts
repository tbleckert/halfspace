import { useCallback } from 'react'
import type { TeamDirectoryInput } from '@shared/team-directory'
import {
  readTeamDirectory,
  teamDirectoryKey,
  writeTeamDirectory
} from '@/data/team-directory-cache'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { useStaleRefresh, type RefreshableQuery, type RefreshRequest } from '@/lib/refresh'

let generation = 0
const requests = new Map<string, RefreshRequest>()

export function useTeamDirectory(
  input: TeamDirectoryInput,
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readTeamDirectory>>> {
  const key = teamDirectoryKey(input)
  const cached = useScopedLiveQuery(() => readTeamDirectory(input), [key])
  const { refreshing, error, runRefresh } = useRefreshStatus(key)
  const refresh = useCallback(async () => {
    if (!enabled) return
    await runRefresh(() => refreshTeamDirectory(input), 'Could not refresh teams.')
  }, [input, enabled, runRefresh])
  useStaleRefresh(enabled, cached !== undefined, cached?.query?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

async function refreshTeamDirectory(input: TeamDirectoryInput): Promise<void> {
  const key = teamDirectoryKey(input)
  const active = requests.get(key)
  if (active?.generation === generation) return active.promise
  const started = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshTeamDirectory(input)
    if (started !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeTeamDirectory(input, result.data)
  })()
  requests.set(key, { generation, promise })
  try {
    await promise
  } finally {
    if (requests.get(key)?.promise === promise) requests.delete(key)
  }
}

export function invalidateTeamDirectoryRefreshes(): void {
  generation++
  requests.clear()
}
