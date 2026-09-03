import { useCallback, useState } from 'react'
import type {
  RefreshPlayerAppearancesInput,
  RefreshPlayerStatisticsInput,
  RefreshPlayerTransfersInput
} from '@shared/contracts'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import {
  playerAppearanceQueryKey,
  readPlayerAppearanceQuery,
  readPlayerIdentity,
  readPlayerStatistics,
  readPlayerTransfers,
  playerStatisticsQueryKey,
  writePlayerAppearancesRefresh,
  writePlayerRefresh,
  writePlayerStatisticsRefresh,
  writePlayerTransfersRefresh
} from '@/data/db'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

type PlayerIdentityCache = Awaited<ReturnType<typeof readPlayerIdentity>>
type PlayerAppearancesCache = Awaited<ReturnType<typeof readPlayerAppearanceQuery>>
type PlayerStatisticsCache = Awaited<ReturnType<typeof readPlayerStatistics>>
type PlayerTransfersCache = Awaited<ReturnType<typeof readPlayerTransfers>>

let refreshGeneration = 0
const playerRefreshes = new Map<number, RefreshRequest>()
const playerAppearanceRefreshes = new Map<string, RefreshRequest>()
const playerStatisticsRefreshes = new Map<string, RefreshRequest>()
const playerTransferRefreshes = new Map<number, RefreshRequest>()

export function usePlayerEntity(
  playerId: number | null,
  enabled: boolean
): RefreshableQuery<PlayerIdentityCache> {
  const cached = useScopedLiveQuery(
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

  useStaleRefresh(
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
): RefreshableQuery<PlayerAppearancesCache> {
  const cacheKey = input ? playerAppearanceQueryKey(input) : null
  const cached = useScopedLiveQuery(
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

  useStaleRefresh(enabled && input !== null, cached !== undefined, cached?.query?.staleAt, refresh)

  return { cached, refreshing, error, refresh }
}

export function usePlayerStatistics(
  input: RefreshPlayerStatisticsInput | null,
  enabled: boolean
): RefreshableQuery<PlayerStatisticsCache> {
  const cacheKey = input ? playerStatisticsQueryKey(input) : null
  const cached = useScopedLiveQuery(
    () => (input === null ? Promise.resolve(null) : readPlayerStatistics(input)),
    [cacheKey]
  )
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || input === null) return

    setRefreshing(true)
    setError(null)

    try {
      await refreshPlayerStatisticsQuery(input)
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Could not refresh player statistics.'
      )
    } finally {
      setRefreshing(false)
    }
  }, [enabled, input])

  useStaleRefresh(enabled && input !== null, cached !== undefined, cached?.staleAt, refresh)

  return { cached, refreshing, error, refresh }
}

export function usePlayerTransfers(
  input: RefreshPlayerTransfersInput | null,
  enabled: boolean
): RefreshableQuery<PlayerTransfersCache> {
  const cached = useScopedLiveQuery(
    () =>
      input === null ? Promise.resolve({ query: null, transfers: [] }) : readPlayerTransfers(input),
    [input?.playerId]
  )
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || input === null) return

    setRefreshing(true)
    setError(null)

    try {
      await refreshPlayerTransfers(input)
    } catch (refreshError) {
      setError(
        refreshError instanceof Error ? refreshError.message : 'Could not refresh player career.'
      )
    } finally {
      setRefreshing(false)
    }
  }, [enabled, input])

  useStaleRefresh(enabled && input !== null, cached !== undefined, cached?.query?.staleAt, refresh)

  return { cached, refreshing, error, refresh }
}

export function invalidatePlayerRefreshes(): void {
  refreshGeneration += 1
  playerRefreshes.clear()
  playerAppearanceRefreshes.clear()
  playerStatisticsRefreshes.clear()
  playerTransferRefreshes.clear()
}

export async function prefetchPlayerEntity(playerId: number): Promise<void> {
  const cached = await readPlayerIdentity(playerId)
  if (cached.player?.detailed && cached.player.staleAt > Date.now()) return

  await refreshPlayerEntity(playerId)
}

export async function prefetchPlayerAppearances(
  input: RefreshPlayerAppearancesInput
): Promise<void> {
  const cached = await readPlayerAppearanceQuery(input)
  if (cached.query && cached.query.staleAt > Date.now()) return

  await refreshPlayerAppearanceQuery(input)
}

export async function prefetchPlayerStatistics(input: RefreshPlayerStatisticsInput): Promise<void> {
  const cached = await readPlayerStatistics(input)
  if (cached && cached.staleAt > Date.now()) return

  await refreshPlayerStatisticsQuery(input)
}

export async function prefetchPlayerTransfers(input: RefreshPlayerTransfersInput): Promise<void> {
  const cached = await readPlayerTransfers(input)
  if (cached.query && cached.query.staleAt > Date.now()) return

  await refreshPlayerTransfers(input)
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

async function refreshPlayerStatisticsQuery(input: RefreshPlayerStatisticsInput): Promise<void> {
  const key = playerStatisticsQueryKey(input)
  const active = playerStatisticsRefreshes.get(key)
  if (active?.generation === refreshGeneration) return active.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshPlayerStatistics(input)
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writePlayerStatisticsRefresh(input, result.data)
  })()

  playerStatisticsRefreshes.set(key, { generation, promise })

  try {
    await promise
  } finally {
    if (playerStatisticsRefreshes.get(key)?.promise === promise) {
      playerStatisticsRefreshes.delete(key)
    }
  }
}

async function refreshPlayerTransfers(input: RefreshPlayerTransfersInput): Promise<void> {
  const active = playerTransferRefreshes.get(input.playerId)
  if (active?.generation === refreshGeneration) return active.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshPlayerTransfers(input)
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writePlayerTransfersRefresh(input, result.data)
  })()

  playerTransferRefreshes.set(input.playerId, { generation, promise })

  try {
    await promise
  } finally {
    if (playerTransferRefreshes.get(input.playerId)?.promise === promise) {
      playerTransferRefreshes.delete(input.playerId)
    }
  }
}
