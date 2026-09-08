import { useCallback } from 'react'
import type { PlayerDirectoryInput } from '@shared/discovery'
import {
  readPlayerDirectory,
  writePlayerDirectory,
  playerDirectoryKey
} from '@/data/discovery-cache'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { useStaleRefresh, type RefreshableQuery, type RefreshRequest } from '@/lib/refresh'

let generation = 0
const requests = new Map<string, RefreshRequest>()
export function usePlayerDirectory(
  input: PlayerDirectoryInput | null,
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readPlayerDirectory>> | null> {
  const key = input ? playerDirectoryKey(input) : null
  const cached = useScopedLiveQuery(
    () => (input ? readPlayerDirectory(input) : Promise.resolve(null)),
    [key]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(key)
  const refresh = useCallback(async () => {
    if (!input || !enabled) return
    await runRefresh(() => refreshPlayerDirectory(input), 'Could not refresh players.')
  }, [input, enabled, runRefresh])
  useStaleRefresh(enabled && input !== null, cached !== undefined, cached?.query?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}
export async function prefetchPlayerDirectory(input: PlayerDirectoryInput): Promise<void> {
  const started = generation
  const cached = await readPlayerDirectory(input)
  if (started !== generation) return
  if ((cached?.query?.staleAt ?? 0) > Date.now()) return
  await refreshPlayerDirectory(input)
}
async function refreshPlayerDirectory(input: PlayerDirectoryInput): Promise<void> {
  const key = playerDirectoryKey(input)
  const active = requests.get(key)
  if (active?.generation === generation) return active.promise
  const started = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshPlayerDirectory(input)
    if (started !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writePlayerDirectory(input, result.data)
  })()
  requests.set(key, { generation, promise })
  try {
    await promise
  } finally {
    if (requests.get(key)?.promise === promise) requests.delete(key)
  }
}
export function invalidatePlayerDirectoryRefreshes(): void {
  generation++
  requests.clear()
}
