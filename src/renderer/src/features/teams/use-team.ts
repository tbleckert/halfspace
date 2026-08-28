import { useCallback, useEffect, useState } from 'react'
import type { RefreshTeamFixturesInput } from '@shared/contracts'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  readTeamFixtureQuery,
  readTeamIdentity,
  teamFixtureQueryKey,
  writeTeamFixtureRefresh,
  writeTeamRefresh
} from '@/data/db'

interface RefreshRequest {
  generation: number
  promise: Promise<void>
}

type TeamIdentityCache = Awaited<ReturnType<typeof readTeamIdentity>>
type TeamFixturesCache = Awaited<ReturnType<typeof readTeamFixtureQuery>>

interface TeamQueryResult<T> {
  cached: T | undefined
  refreshing: boolean
  error: string | null
  refresh: () => Promise<void>
}

let refreshGeneration = 0
const teamRefreshes = new Map<number, RefreshRequest>()
const teamFixtureRefreshes = new Map<string, RefreshRequest>()

export function useTeamEntity(
  teamId: number | null,
  enabled: boolean
): TeamQueryResult<TeamIdentityCache> {
  const cached = useLiveQuery(
    () =>
      teamId === null
        ? Promise.resolve({ team: null, participant: null })
        : readTeamIdentity(teamId),
    [teamId]
  )
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || teamId === null) return

    setRefreshing(true)
    setError(null)

    try {
      await refreshTeamEntity(teamId)
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Could not refresh team.')
    } finally {
      setRefreshing(false)
    }
  }, [enabled, teamId])

  useAutomaticRefresh(
    enabled && teamId !== null,
    cached !== undefined,
    cached?.team?.staleAt,
    refresh
  )

  return { cached, refreshing, error, refresh }
}

export function useTeamFixtures(
  input: RefreshTeamFixturesInput | null,
  enabled: boolean
): TeamQueryResult<TeamFixturesCache> {
  const cacheKey = input ? teamFixtureQueryKey(input) : null
  const cached = useLiveQuery(
    () =>
      input === null ? Promise.resolve({ query: null, fixtures: [] }) : readTeamFixtureQuery(input),
    [cacheKey]
  )
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || input === null) return

    setRefreshing(true)
    setError(null)

    try {
      await refreshTeamFixtureQuery(input)
    } catch (refreshError) {
      setError(
        refreshError instanceof Error ? refreshError.message : 'Could not refresh team fixtures.'
      )
    } finally {
      setRefreshing(false)
    }
  }, [enabled, input])

  useAutomaticRefresh(
    enabled && input !== null,
    cached !== undefined,
    cached?.query?.staleAt,
    refresh
  )

  return { cached, refreshing, error, refresh }
}

export function invalidateTeamRefreshes(): void {
  refreshGeneration += 1
  teamRefreshes.clear()
  teamFixtureRefreshes.clear()
}

export async function refreshTeamEntity(teamId: number): Promise<void> {
  const active = teamRefreshes.get(teamId)
  if (active?.generation === refreshGeneration) return active.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshTeam({ teamId })
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writeTeamRefresh(result.data)
  })()

  teamRefreshes.set(teamId, { generation, promise })

  try {
    await promise
  } finally {
    if (teamRefreshes.get(teamId)?.promise === promise) teamRefreshes.delete(teamId)
  }
}

function useAutomaticRefresh(
  enabled: boolean,
  cacheLoaded: boolean,
  staleAt: number | undefined,
  refresh: () => Promise<void>
): void {
  useEffect(() => {
    if (!enabled || !cacheLoaded) return

    const delay = staleAt ? Math.max(0, staleAt - Date.now()) : 0
    const timeout = window.setTimeout(() => void refresh(), delay)

    return () => window.clearTimeout(timeout)
  }, [cacheLoaded, enabled, refresh, staleAt])
}

async function refreshTeamFixtureQuery(input: RefreshTeamFixturesInput): Promise<void> {
  const key = teamFixtureQueryKey(input)
  const active = teamFixtureRefreshes.get(key)
  if (active?.generation === refreshGeneration) return active.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshTeamFixtures(input)
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writeTeamFixtureRefresh(input, result.data)
  })()

  teamFixtureRefreshes.set(key, { generation, promise })

  try {
    await promise
  } finally {
    if (teamFixtureRefreshes.get(key)?.promise === promise) teamFixtureRefreshes.delete(key)
  }
}
