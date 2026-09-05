import { useCallback } from 'react'
import type { RefreshTeamScheduleInput } from '@shared/season-resources'
import {
  readTeamSchedule,
  writeTeamScheduleRefresh,
  teamScheduleQueryKey
} from '@/data/season-resources-cache'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let generation = 0
const requests = new Map<string, RefreshRequest>()

export function useTeamSchedule(
  input: RefreshTeamScheduleInput | null,
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readTeamSchedule>>> {
  const key = input === null ? null : teamScheduleQueryKey(input)
  const cached = useScopedLiveQuery(
    () => (input === null ? Promise.resolve(null) : readTeamSchedule(input)),
    [key]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(key)
  const refresh = useCallback(async () => {
    if (!enabled || input === null) return
    await runRefresh(() => refreshTeamSchedule(input), 'Could not refresh team schedule.')
  }, [input, enabled, runRefresh])
  useStaleRefresh(enabled && input !== null, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export function invalidateTeamScheduleRefreshes(): void {
  generation++
  requests.clear()
}

export async function prefetchTeamSchedule(input: RefreshTeamScheduleInput): Promise<void> {
  const cached = await readTeamSchedule(input)
  if (cached && cached.staleAt > Date.now()) return
  await refreshTeamSchedule(input)
}

export async function refreshTeamSchedule(input: RefreshTeamScheduleInput): Promise<void> {
  const key = teamScheduleQueryKey(input)
  const active = requests.get(key)
  if (active?.generation === generation) return active.promise
  const startedGeneration = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshTeamSchedule(input)
    if (startedGeneration !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeTeamScheduleRefresh(input, result.data)
  })()
  requests.set(key, { generation: startedGeneration, promise })
  try {
    await promise
  } finally {
    if (requests.get(key)?.promise === promise) requests.delete(key)
  }
}
