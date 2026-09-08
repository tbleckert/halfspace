import { useCallback } from 'react'
import type { CountryCompetitionsInput } from '@shared/discovery'
import { readCountryCompetitions, writeCountryCompetitions } from '@/data/discovery-cache'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useRefreshStatus } from '@/lib/use-refresh-status'
import { useStaleRefresh, type RefreshableQuery, type RefreshRequest } from '@/lib/refresh'

let generation = 0
const requests = new Map<string, RefreshRequest>()
export function useCountryCompetitions(
  input: CountryCompetitionsInput | null,
  enabled: boolean
): RefreshableQuery<Awaited<ReturnType<typeof readCountryCompetitions>> | null> {
  const key = input ? String(input.countryId) : null
  const cached = useScopedLiveQuery(
    () => (input ? readCountryCompetitions(input) : Promise.resolve(null)),
    [key]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(key)
  const refresh = useCallback(async () => {
    if (!input || !enabled) return
    await runRefresh(() => refreshCountryCompetitions(input), 'Could not refresh competitions.')
  }, [input, enabled, runRefresh])
  useStaleRefresh(enabled && input !== null, cached !== undefined, cached?.query?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}
export async function prefetchCountryCompetitions(input: CountryCompetitionsInput): Promise<void> {
  const started = generation
  const cached = await readCountryCompetitions(input)
  if (started !== generation) return
  if ((cached?.query?.staleAt ?? 0) > Date.now()) return
  await refreshCountryCompetitions(input)
}
async function refreshCountryCompetitions(input: CountryCompetitionsInput): Promise<void> {
  const key = String(input.countryId)
  const active = requests.get(key)
  if (active?.generation === generation) return active.promise
  const started = generation
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshCountryCompetitions(input)
    if (started !== generation) return
    if (!result.ok) throw new Error(result.error.message)
    await writeCountryCompetitions(input, result.data)
  })()
  requests.set(key, { generation, promise })
  try {
    await promise
  } finally {
    if (requests.get(key)?.promise === promise) requests.delete(key)
  }
}
export function invalidateCountryCompetitionsRefreshes(): void {
  generation++
  requests.clear()
}
