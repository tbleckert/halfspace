import type {
  PlayerDirectoryInput,
  PlayerDirectoryRefresh,
  CountryCompetitionsInput,
  CountryCompetitionsRefresh,
  TeamSeasonsInput,
  TeamSeasonsRefresh
} from '@shared/discovery'
import {
  db,
  toCachedIncludedPlayer,
  cacheIncludedCompetitions,
  type PlayerDirectoryQuery,
  type CountryCompetitionsQuery,
  type TeamSeasonsQuery,
  type CachedPlayer,
  type CachedCompetition
} from './db'

export function playerDirectoryKey(input: PlayerDirectoryInput): string {
  return JSON.stringify([input.query ?? '', input.countryId ?? null, input.page])
}
export async function readPlayerDirectory(
  input: PlayerDirectoryInput
): Promise<{ query: PlayerDirectoryQuery | null; players: CachedPlayer[] }> {
  const query = await db.playerDirectoryQueries.get(playerDirectoryKey(input))
  const players = query
    ? (await db.players.bulkGet(query.playerIds)).filter(
        (player): player is CachedPlayer => !!player
      )
    : []
  return { query: query ?? null, players }
}
export async function writePlayerDirectory(
  input: PlayerDirectoryInput,
  refresh: PlayerDirectoryRefresh
): Promise<void> {
  const key = playerDirectoryKey(input)
  if (
    key !== playerDirectoryKey(refresh) ||
    refresh.players.some(
      (player) => input.countryId !== undefined && player.country_id !== input.countryId
    )
  )
    throw new Error('Player directory response does not match the requested page.')
  await db.transaction('rw', db.playerDirectoryQueries, db.players, async () => {
    const previous = await db.playerDirectoryQueries.get(key)
    if (previous && previous.fetchedAt > refresh.fetchedAt) return
    const players = [...new Map(refresh.players.map((player) => [player.id, player])).values()]
    const existing = await db.players.bulkGet(players.map(({ id }) => id))
    await db.players.bulkPut(
      players.map((player, index) =>
        toCachedIncludedPlayer(player, existing[index], refresh.fetchedAt)
      )
    )
    await db.playerDirectoryQueries.put({
      ...input,
      fetchedAt: refresh.fetchedAt,
      hasMore: refresh.hasMore,
      key,
      playerIds: players.map(({ id }) => id),
      staleAt: refresh.fetchedAt + 86_400_000
    })
  })
}
export async function readCountryCompetitions(
  input: CountryCompetitionsInput
): Promise<{ query: CountryCompetitionsQuery | null; competitions: CachedCompetition[] }> {
  const query = await db.countryCompetitionQueries.get(input.countryId)
  const competitions = query
    ? (await db.competitions.bulkGet(query.competitionIds)).filter(
        (competition): competition is CachedCompetition => !!competition
      )
    : []
  return { query: query ?? null, competitions }
}
export async function writeCountryCompetitions(
  input: CountryCompetitionsInput,
  refresh: CountryCompetitionsRefresh
): Promise<void> {
  if (
    refresh.countryId !== input.countryId ||
    refresh.competitions.some((competition) => competition.country_id !== input.countryId)
  )
    throw new Error('Competitions do not match the requested country.')
  await db.transaction('rw', db.countryCompetitionQueries, db.competitions, async () => {
    const previous = await db.countryCompetitionQueries.get(input.countryId)
    if (previous && previous.fetchedAt > refresh.fetchedAt) return
    await cacheIncludedCompetitions(refresh.competitions, refresh.fetchedAt)
    await db.countryCompetitionQueries.put({
      countryId: input.countryId,
      competitionIds: [...new Set(refresh.competitions.map(({ id }) => id))],
      fetchedAt: refresh.fetchedAt,
      staleAt: refresh.fetchedAt + 86_400_000
    })
  })
}
export async function readTeamSeasons(input: TeamSeasonsInput): Promise<TeamSeasonsQuery | null> {
  return (await db.teamSeasonsQueries.get(input.teamId)) ?? null
}
export async function writeTeamSeasons(
  input: TeamSeasonsInput,
  refresh: TeamSeasonsRefresh
): Promise<void> {
  if (
    refresh.teamId !== input.teamId ||
    refresh.seasons.some((season) => season.league && season.league.id !== season.league_id)
  )
    throw new Error('Season history does not match the requested team.')
  await db.transaction('rw', db.teamSeasonsQueries, db.competitions, async () => {
    const previous = await db.teamSeasonsQueries.get(input.teamId)
    if (previous && previous.fetchedAt > refresh.fetchedAt) return
    const leagues = [
      ...new Map(
        refresh.seasons.flatMap((season) =>
          season.league ? [[season.league.id, season.league] as const] : []
        )
      ).values()
    ]
    await cacheIncludedCompetitions(leagues, refresh.fetchedAt)
    await db.teamSeasonsQueries.put({ ...refresh, staleAt: refresh.fetchedAt + 86_400_000 })
  })
}
