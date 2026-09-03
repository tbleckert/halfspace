import { useCallback, useState } from 'react'
import type {
  RefreshTeamFixturesInput,
  RefreshTeamStatisticsInput,
  RefreshTeamTransfersInput
} from '@shared/contracts'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import {
  readTeamFixtureQuery,
  readTeamIdentity,
  readTeamSquad,
  readTeamStatistics,
  readTeamTransfers,
  teamFixtureQueryKey,
  teamStatisticsQueryKey,
  teamSquadQueryKey,
  writeTeamFixtureRefresh,
  writeTeamRefresh,
  writeTeamSquadRefresh,
  writeTeamStatisticsRefresh,
  writeTeamTransfersRefresh
} from '@/data/db'
import { addDaysToIsoDate, currentTimeZone, todayInTimeZone } from '@/lib/date'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

type TeamIdentityCache = Awaited<ReturnType<typeof readTeamIdentity>>
type TeamFixturesCache = Awaited<ReturnType<typeof readTeamFixtureQuery>>
type TeamSquadCache = Awaited<ReturnType<typeof readTeamSquad>>
type TeamStatisticsCache = Awaited<ReturnType<typeof readTeamStatistics>>
type TeamTransfersCache = Awaited<ReturnType<typeof readTeamTransfers>>

let refreshGeneration = 0
const teamRefreshes = new Map<number, RefreshRequest>()
const teamFixtureRefreshes = new Map<string, RefreshRequest>()
const teamSquadRefreshes = new Map<string, RefreshRequest>()
const teamStatisticsRefreshes = new Map<string, RefreshRequest>()
const teamTransferRefreshes = new Map<number, RefreshRequest>()

export function useTeamEntity(
  teamId: number | null,
  enabled: boolean
): RefreshableQuery<TeamIdentityCache> {
  const cached = useScopedLiveQuery(
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

  useStaleRefresh(enabled && teamId !== null, cached !== undefined, cached?.team?.staleAt, refresh)

  return { cached, refreshing, error, refresh }
}

export function useTeamFixtures(
  input: RefreshTeamFixturesInput | null,
  enabled: boolean
): RefreshableQuery<TeamFixturesCache> {
  const cacheKey = input ? teamFixtureQueryKey(input) : null
  const cached = useScopedLiveQuery(
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

  useStaleRefresh(enabled && input !== null, cached !== undefined, cached?.query?.staleAt, refresh)

  return { cached, refreshing, error, refresh }
}

export function useTeamSquad(
  teamId: number | null,
  enabled: boolean,
  seasonId?: number
): RefreshableQuery<TeamSquadCache> {
  const cached = useScopedLiveQuery(
    () =>
      teamId === null
        ? Promise.resolve({ query: null, members: [] })
        : readTeamSquad(teamId, seasonId),
    [teamId, seasonId]
  )
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || teamId === null) return

    setRefreshing(true)
    setError(null)

    try {
      await refreshTeamSquad(teamId, seasonId)
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Could not refresh squad.')
    } finally {
      setRefreshing(false)
    }
  }, [enabled, teamId, seasonId])

  useStaleRefresh(enabled && teamId !== null, cached !== undefined, cached?.query?.staleAt, refresh)

  return { cached, refreshing, error, refresh }
}

export function useTeamStatistics(
  input: RefreshTeamStatisticsInput | null,
  enabled: boolean
): RefreshableQuery<TeamStatisticsCache> {
  const cacheKey = input ? teamStatisticsQueryKey(input) : null
  const cached = useScopedLiveQuery(
    () => (input === null ? Promise.resolve(null) : readTeamStatistics(input)),
    [cacheKey]
  )
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || input === null) return

    setRefreshing(true)
    setError(null)

    try {
      await refreshTeamStatisticsQuery(input)
    } catch (refreshError) {
      setError(
        refreshError instanceof Error ? refreshError.message : 'Could not refresh team statistics.'
      )
    } finally {
      setRefreshing(false)
    }
  }, [enabled, input])

  useStaleRefresh(enabled && input !== null, cached !== undefined, cached?.staleAt, refresh)

  return { cached, refreshing, error, refresh }
}

export function useTeamTransfers(
  input: RefreshTeamTransfersInput | null,
  enabled: boolean
): RefreshableQuery<TeamTransfersCache> {
  const cached = useScopedLiveQuery(
    () =>
      input === null ? Promise.resolve({ query: null, transfers: [] }) : readTeamTransfers(input),
    [input?.teamId]
  )
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || input === null) return

    setRefreshing(true)
    setError(null)

    try {
      await refreshTeamTransfers(input)
    } catch (refreshError) {
      setError(
        refreshError instanceof Error ? refreshError.message : 'Could not refresh team transfers.'
      )
    } finally {
      setRefreshing(false)
    }
  }, [enabled, input])

  useStaleRefresh(enabled && input !== null, cached !== undefined, cached?.query?.staleAt, refresh)

  return { cached, refreshing, error, refresh }
}

export function invalidateTeamRefreshes(): void {
  refreshGeneration += 1
  teamRefreshes.clear()
  teamFixtureRefreshes.clear()
  teamSquadRefreshes.clear()
  teamStatisticsRefreshes.clear()
  teamTransferRefreshes.clear()
}

export async function prefetchTeamEntity(teamId: number): Promise<void> {
  const cached = await readTeamIdentity(teamId)
  if (cached.team && cached.team.staleAt > Date.now()) return

  await refreshTeamEntity(teamId)
}

export async function prefetchTeamFixtures(input: RefreshTeamFixturesInput): Promise<void> {
  const cached = await readTeamFixtureQuery(input)
  if (cached.query && cached.query.staleAt > Date.now()) return

  await refreshTeamFixtureQuery(input)
}

export function teamFixtureInput(
  teamId: number,
  startDate?: string,
  timeZone = currentTimeZone()
): RefreshTeamFixturesInput {
  const date = startDate ?? todayInTimeZone(timeZone)

  return {
    teamId,
    startDate: date,
    endDate: addDaysToIsoDate(date, 60),
    timeZone
  }
}

export async function prefetchTeamSquad(teamId: number, seasonId?: number): Promise<void> {
  const cached = await readTeamSquad(teamId, seasonId)
  if (cached.query && cached.query.staleAt > Date.now()) return

  await refreshTeamSquad(teamId, seasonId)
}

export async function prefetchTeamStatistics(input: RefreshTeamStatisticsInput): Promise<void> {
  const cached = await readTeamStatistics(input)
  if (cached && cached.staleAt > Date.now()) return

  await refreshTeamStatisticsQuery(input)
}

export async function prefetchTeamTransfers(input: RefreshTeamTransfersInput): Promise<void> {
  const cached = await readTeamTransfers(input)
  if (cached.query && cached.query.staleAt > Date.now()) return

  await refreshTeamTransfers(input)
}

async function refreshTeamTransfers(input: RefreshTeamTransfersInput): Promise<void> {
  const active = teamTransferRefreshes.get(input.teamId)
  if (active?.generation === refreshGeneration) return active.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshTeamTransfers(input)
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writeTeamTransfersRefresh(input, result.data)
  })()

  teamTransferRefreshes.set(input.teamId, { generation, promise })

  try {
    await promise
  } finally {
    if (teamTransferRefreshes.get(input.teamId)?.promise === promise) {
      teamTransferRefreshes.delete(input.teamId)
    }
  }
}

async function refreshTeamStatisticsQuery(input: RefreshTeamStatisticsInput): Promise<void> {
  const key = teamStatisticsQueryKey(input)
  const active = teamStatisticsRefreshes.get(key)
  if (active?.generation === refreshGeneration) return active.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshTeamStatistics(input)
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writeTeamStatisticsRefresh(input, result.data)
  })()

  teamStatisticsRefreshes.set(key, { generation, promise })

  try {
    await promise
  } finally {
    if (teamStatisticsRefreshes.get(key)?.promise === promise) teamStatisticsRefreshes.delete(key)
  }
}

export async function refreshTeamSquad(teamId: number, seasonId?: number): Promise<void> {
  const key = teamSquadQueryKey(teamId, seasonId)
  const active = teamSquadRefreshes.get(key)
  if (active?.generation === refreshGeneration) return active.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshTeamSquad({ teamId, seasonId })
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writeTeamSquadRefresh(teamId, result.data, seasonId)
  })()

  teamSquadRefreshes.set(key, { generation, promise })

  try {
    await promise
  } finally {
    if (teamSquadRefreshes.get(key)?.promise === promise) teamSquadRefreshes.delete(key)
  }
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
