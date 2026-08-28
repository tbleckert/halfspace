import { useCallback, useEffect, useState } from 'react'
import type { RefreshPlayerAppearancesInput } from '@shared/contracts'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  playerAppearanceQueryKey,
  readPlayerAppearanceQuery,
  readPlayerIdentity,
  writePlayerAppearancesRefresh,
  writePlayerRefresh
} from '@/data/db'

interface RefreshRequest {
  generation: number
  promise: Promise<void>
}

type PlayerIdentityCache = Awaited<ReturnType<typeof readPlayerIdentity>>
type PlayerAppearancesCache = Awaited<ReturnType<typeof readPlayerAppearanceQuery>>

interface PlayerQueryResult<T> {
  cached: T | undefined
  refreshing: boolean
  error: string | null
  refresh: () => Promise<void>
}

let refreshGeneration = 0
const playerRefreshes = new Map<number, RefreshRequest>()
const playerAppearanceRefreshes = new Map<string, RefreshRequest>()

export function usePlayerEntity(
  playerId: number | null,
  enabled: boolean
): PlayerQueryResult<PlayerIdentityCache> {
  const cached = useLiveQuery(
    () =>
      playerId === null
        ? Promise.resolve({ player: null, teams: [] })
        : readPlayerIdentity(playerId),
    [playerId]
  )
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || playerId === null) return

    setRefreshing(true)
    setError(null)

    try {
      await refreshPlayerEntity(playerId)
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Could not refresh player.')
    } finally {
      setRefreshing(false)
    }
  }, [enabled, playerId])

  useAutomaticRefresh(
    enabled && playerId !== null,
    cached !== undefined,
    cached?.player?.staleAt,
    refresh
  )

  return { cached, refreshing, error, refresh }
}

export function usePlayerAppearances(
  input: RefreshPlayerAppearancesInput | null,
  enabled: boolean
): PlayerQueryResult<PlayerAppearancesCache> {
  const cacheKey = input ? playerAppearanceQueryKey(input) : null
  const cached = useLiveQuery(
    () =>
      input === null
        ? Promise.resolve({ query: null, appearances: [] })
        : readPlayerAppearanceQuery(input),
    [cacheKey]
  )
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || input === null) return

    setRefreshing(true)
    setError(null)

    try {
      await refreshPlayerAppearanceQuery(input)
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Could not refresh player appearances.'
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

export function invalidatePlayerRefreshes(): void {
  refreshGeneration += 1
  playerRefreshes.clear()
  playerAppearanceRefreshes.clear()
}

export async function refreshPlayerEntity(playerId: number): Promise<void> {
  const active = playerRefreshes.get(playerId)
  if (active?.generation === refreshGeneration) return active.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshPlayer({ playerId })
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writePlayerRefresh(result.data)
  })()

  playerRefreshes.set(playerId, { generation, promise })

  try {
    await promise
  } finally {
    if (playerRefreshes.get(playerId)?.promise === promise) playerRefreshes.delete(playerId)
  }
}

async function refreshPlayerAppearanceQuery(input: RefreshPlayerAppearancesInput): Promise<void> {
  const key = playerAppearanceQueryKey(input)
  const active = playerAppearanceRefreshes.get(key)
  if (active?.generation === refreshGeneration) return active.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshPlayerAppearances(input)
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writePlayerAppearancesRefresh(input, result.data)
  })()

  playerAppearanceRefreshes.set(key, { generation, promise })

  try {
    await promise
  } finally {
    if (playerAppearanceRefreshes.get(key)?.promise === promise) {
      playerAppearanceRefreshes.delete(key)
    }
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
