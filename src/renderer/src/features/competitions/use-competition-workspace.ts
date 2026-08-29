import { useCallback, useEffect, useState } from 'react'
import type { RefreshCompetitionFixturesInput } from '@shared/contracts'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  competitionFixtureQueryKey,
  db,
  readCompetitionFixtureQuery,
  readCompetitionSeasons,
  readStandingsQuery,
  writeCompetitionFixtureRefresh,
  writeCompetitionSeasonsRefresh,
  writeStandingsRefresh
} from '@/data/db'
import { addDaysToIsoDate, currentTimeZone, todayInTimeZone } from '@/lib/date'

interface RefreshRequest {
  generation: number
  promise: Promise<void>
}

type StandingsCache = Awaited<ReturnType<typeof readStandingsQuery>>
type CompetitionSeasonsCache = Awaited<ReturnType<typeof readCompetitionSeasons>>
type CompetitionFixturesCache = Awaited<ReturnType<typeof readCompetitionFixtureQuery>>

interface WorkspaceQueryResult<T> {
  cached: T | undefined
  refreshing: boolean
  error: string | null
  refresh: () => Promise<void>
}

let refreshGeneration = 0
const standingRefreshes = new Map<number, RefreshRequest>()
const seasonRefreshes = new Map<number, RefreshRequest>()
const fixtureRefreshes = new Map<string, RefreshRequest>()

export function useStandings(
  seasonId: number | null,
  enabled: boolean
): WorkspaceQueryResult<StandingsCache> {
  const cached = useLiveQuery(
    () =>
      seasonId === null
        ? Promise.resolve({ query: null, standings: [] })
        : readStandingsQuery(seasonId),
    [seasonId]
  )
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || seasonId === null) return

    setRefreshing(true)
    setError(null)

    try {
      await refreshStandingsQuery(seasonId)
    } catch (refreshError) {
      setError(
        refreshError instanceof Error ? refreshError.message : 'Could not refresh standings.'
      )
    } finally {
      setRefreshing(false)
    }
  }, [enabled, seasonId])

  useAutomaticRefresh(
    enabled && seasonId !== null,
    cached !== undefined,
    cached?.query?.staleAt,
    refresh
  )

  return { cached, refreshing, error, refresh }
}

export function useCompetitionSeasons(
  competitionId: number | null,
  enabled: boolean
): WorkspaceQueryResult<CompetitionSeasonsCache> {
  const cached = useLiveQuery(
    () => (competitionId === null ? Promise.resolve(null) : readCompetitionSeasons(competitionId)),
    [competitionId]
  )
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || competitionId === null) return

    setRefreshing(true)
    setError(null)

    try {
      await refreshCompetitionSeasonsQuery(competitionId)
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Could not refresh competition seasons.'
      )
    } finally {
      setRefreshing(false)
    }
  }, [competitionId, enabled])

  useAutomaticRefresh(
    enabled && competitionId !== null,
    cached !== undefined,
    cached?.staleAt,
    refresh
  )

  return { cached, refreshing, error, refresh }
}

export function useCompetitionFixtures(
  input: RefreshCompetitionFixturesInput | null,
  enabled: boolean
): WorkspaceQueryResult<CompetitionFixturesCache> {
  const cacheKey = input ? competitionFixtureQueryKey(input) : null
  const cached = useLiveQuery(
    () =>
      input === null
        ? Promise.resolve({ query: null, fixtures: [] })
        : readCompetitionFixtureQuery(input),
    [cacheKey]
  )
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || input === null) return

    setRefreshing(true)
    setError(null)

    try {
      await refreshCompetitionFixtureQuery(input)
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Could not refresh competition fixtures.'
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

export function invalidateCompetitionWorkspaceRefreshes(): void {
  refreshGeneration += 1
  standingRefreshes.clear()
  seasonRefreshes.clear()
  fixtureRefreshes.clear()
}

export async function prefetchCompetitionWorkspace(competitionId: number): Promise<void> {
  const input = competitionWorkspaceFixtureInput(competitionId)
  const competition = await db.competitions.get(competitionId)
  const [fixtures, standings] = await Promise.all([
    readCompetitionFixtureQuery(input),
    competition?.currentSeasonId
      ? readStandingsQuery(competition.currentSeasonId)
      : Promise.resolve(null)
  ])
  const refreshes: Promise<void>[] = []

  if (!fixtures.query || fixtures.query.staleAt <= Date.now()) {
    refreshes.push(refreshCompetitionFixtureQuery(input))
  }

  if (
    competition?.currentSeasonId &&
    (!standings?.query || standings.query.staleAt <= Date.now())
  ) {
    refreshes.push(refreshStandingsQuery(competition.currentSeasonId))
  }

  await Promise.all(refreshes)
}

export function competitionWorkspaceFixtureInput(
  competitionId: number,
  centerDate?: string,
  timeZone = currentTimeZone()
): RefreshCompetitionFixturesInput {
  const date = centerDate ?? todayInTimeZone(timeZone)

  return {
    competitionId,
    startDate: addDaysToIsoDate(date, -14),
    endDate: addDaysToIsoDate(date, 14),
    timeZone
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

async function refreshStandingsQuery(seasonId: number): Promise<void> {
  const active = standingRefreshes.get(seasonId)
  if (active?.generation === refreshGeneration) return active.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshStandings({ seasonId })
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writeStandingsRefresh(seasonId, result.data)
  })()

  standingRefreshes.set(seasonId, { generation, promise })

  try {
    await promise
  } finally {
    if (standingRefreshes.get(seasonId)?.promise === promise) standingRefreshes.delete(seasonId)
  }
}

async function refreshCompetitionSeasonsQuery(competitionId: number): Promise<void> {
  const active = seasonRefreshes.get(competitionId)
  if (active?.generation === refreshGeneration) return active.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshCompetitionSeasons({ competitionId })
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writeCompetitionSeasonsRefresh(competitionId, result.data)
  })()

  seasonRefreshes.set(competitionId, { generation, promise })

  try {
    await promise
  } finally {
    if (seasonRefreshes.get(competitionId)?.promise === promise) {
      seasonRefreshes.delete(competitionId)
    }
  }
}

async function refreshCompetitionFixtureQuery(
  input: RefreshCompetitionFixturesInput
): Promise<void> {
  const key = competitionFixtureQueryKey(input)
  const active = fixtureRefreshes.get(key)
  if (active?.generation === refreshGeneration) return active.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshCompetitionFixtures(input)
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writeCompetitionFixtureRefresh(input, result.data)
  })()

  fixtureRefreshes.set(key, { generation, promise })

  try {
    await promise
  } finally {
    if (fixtureRefreshes.get(key)?.promise === promise) fixtureRefreshes.delete(key)
  }
}
