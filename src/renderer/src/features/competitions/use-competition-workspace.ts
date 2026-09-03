import { useRefreshStatus } from '@/lib/use-refresh-status'
import { useCallback } from 'react'
import type { RefreshCompetitionFixturesInput } from '@shared/contracts'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import {
  competitionFixtureQueryKey,
  db,
  readCompetitionFixtureQuery,
  readCompetitionSeasons,
  readSeasonStatistics,
  readSeasonTopscorers,
  readStandingsQuery,
  writeCompetitionFixtureRefresh,
  writeCompetitionSeasonsRefresh,
  writeSeasonStatisticsRefresh,
  writeSeasonTopscorersRefresh,
  writeStandingsRefresh
} from '@/data/db'
import { addDaysToIsoDate, currentTimeZone, todayInTimeZone } from '@/lib/date'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

type StandingsCache = Awaited<ReturnType<typeof readStandingsQuery>>
type CompetitionSeasonsCache = Awaited<ReturnType<typeof readCompetitionSeasons>>
type CompetitionFixturesCache = Awaited<ReturnType<typeof readCompetitionFixtureQuery>>
type SeasonStatisticsCache = Awaited<ReturnType<typeof readSeasonStatistics>>
type SeasonTopscorersCache = Awaited<ReturnType<typeof readSeasonTopscorers>>

let refreshGeneration = 0
const standingRefreshes = new Map<number, RefreshRequest>()
const seasonRefreshes = new Map<number, RefreshRequest>()
const seasonStatisticsRefreshes = new Map<number, RefreshRequest>()
const seasonTopscorersRefreshes = new Map<number, RefreshRequest>()
const fixtureRefreshes = new Map<string, RefreshRequest>()

export function useStandings(
  seasonId: number | null,
  enabled: boolean
): RefreshableQuery<StandingsCache> {
  const cached = useScopedLiveQuery(
    () =>
      seasonId === null
        ? Promise.resolve({ query: null, standings: [] })
        : readStandingsQuery(seasonId),
    [seasonId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(seasonId)

  const refresh = useCallback(async () => {
    if (!enabled || seasonId === null) return

    await runRefresh(() => refreshStandingsQuery(seasonId), 'Could not refresh standings.')
  }, [enabled, seasonId, runRefresh])

  useStaleRefresh(
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
): RefreshableQuery<CompetitionSeasonsCache> {
  const cached = useScopedLiveQuery(
    () => (competitionId === null ? Promise.resolve(null) : readCompetitionSeasons(competitionId)),
    [competitionId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(competitionId)

  const refresh = useCallback(async () => {
    if (!enabled || competitionId === null) return

    await runRefresh(
      () => refreshCompetitionSeasonsQuery(competitionId),
      'Could not refresh competition seasons.'
    )
  }, [competitionId, enabled, runRefresh])

  useStaleRefresh(enabled && competitionId !== null, cached !== undefined, cached?.staleAt, refresh)

  return { cached, refreshing, error, refresh }
}

export function useCompetitionFixtures(
  input: RefreshCompetitionFixturesInput | null,
  enabled: boolean
): RefreshableQuery<CompetitionFixturesCache> {
  const cacheKey = input ? competitionFixtureQueryKey(input) : null
  const cached = useScopedLiveQuery(
    () =>
      input === null
        ? Promise.resolve({ query: null, fixtures: [] })
        : readCompetitionFixtureQuery(input),
    [cacheKey]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(cacheKey)

  const refresh = useCallback(async () => {
    if (!enabled || input === null) return

    await runRefresh(
      () => refreshCompetitionFixtureQuery(input),
      'Could not refresh competition fixtures.'
    )
  }, [enabled, input, runRefresh])

  useStaleRefresh(enabled && input !== null, cached !== undefined, cached?.query?.staleAt, refresh)

  return { cached, refreshing, error, refresh }
}

export function useSeasonStatistics(
  seasonId: number | null,
  enabled: boolean
): RefreshableQuery<SeasonStatisticsCache> {
  const cached = useScopedLiveQuery(
    () => (seasonId === null ? Promise.resolve(null) : readSeasonStatistics(seasonId)),
    [seasonId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(seasonId)

  const refresh = useCallback(async () => {
    if (!enabled || seasonId === null) return

    await runRefresh(
      () => refreshSeasonStatisticsQuery(seasonId),
      'Could not refresh season statistics.'
    )
  }, [enabled, seasonId, runRefresh])

  useStaleRefresh(enabled && seasonId !== null, cached !== undefined, cached?.staleAt, refresh)

  return { cached, refreshing, error, refresh }
}

export function useSeasonTopscorers(
  seasonId: number | null,
  enabled: boolean
): RefreshableQuery<SeasonTopscorersCache> {
  const cached = useScopedLiveQuery(
    () => (seasonId === null ? Promise.resolve(null) : readSeasonTopscorers(seasonId)),
    [seasonId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(seasonId)

  const refresh = useCallback(async () => {
    if (!enabled || seasonId === null) return
    await runRefresh(
      () => refreshSeasonTopscorersQuery(seasonId),
      'Could not refresh player leaders.'
    )
  }, [enabled, seasonId, runRefresh])

  useStaleRefresh(enabled && seasonId !== null, cached !== undefined, cached?.staleAt, refresh)
  return { cached, refreshing, error, refresh }
}

export async function prefetchSeasonTopscorers(seasonId: number): Promise<void> {
  const cached = await readSeasonTopscorers(seasonId)
  if (cached && cached.staleAt > Date.now()) return
  await refreshSeasonTopscorersQuery(seasonId)
}

async function refreshSeasonTopscorersQuery(seasonId: number): Promise<void> {
  const active = seasonTopscorersRefreshes.get(seasonId)
  if (active?.generation === refreshGeneration) return active.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshSeasonTopscorers({ seasonId })
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writeSeasonTopscorersRefresh(seasonId, result.data)
  })()
  seasonTopscorersRefreshes.set(seasonId, { generation, promise })

  try {
    await promise
  } finally {
    if (seasonTopscorersRefreshes.get(seasonId)?.promise === promise) {
      seasonTopscorersRefreshes.delete(seasonId)
    }
  }
}

export function invalidateCompetitionWorkspaceRefreshes(): void {
  refreshGeneration += 1
  standingRefreshes.clear()
  seasonRefreshes.clear()
  seasonStatisticsRefreshes.clear()
  seasonTopscorersRefreshes.clear()
  fixtureRefreshes.clear()
}

export async function prefetchSeasonStatistics(seasonId: number): Promise<void> {
  const cached = await readSeasonStatistics(seasonId)
  if (cached && cached.staleAt > Date.now()) return

  await refreshSeasonStatisticsQuery(seasonId)
}

export async function prefetchStandings(seasonId: number): Promise<void> {
  const cached = await readStandingsQuery(seasonId)
  if (cached.query && cached.query.staleAt > Date.now()) return

  await refreshStandingsQuery(seasonId)
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

async function refreshSeasonStatisticsQuery(seasonId: number): Promise<void> {
  const active = seasonStatisticsRefreshes.get(seasonId)
  if (active?.generation === refreshGeneration) return active.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshSeasonStatistics({ seasonId })
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writeSeasonStatisticsRefresh(seasonId, result.data)
  })()

  seasonStatisticsRefreshes.set(seasonId, { generation, promise })

  try {
    await promise
  } finally {
    if (seasonStatisticsRefreshes.get(seasonId)?.promise === promise) {
      seasonStatisticsRefreshes.delete(seasonId)
    }
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
