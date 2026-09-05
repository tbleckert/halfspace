import type {
  RefreshTeamScheduleInput,
  TeamScheduleRefresh,
  SeasonRefereesRefresh,
  SeasonVenuesRefresh,
  StandingCorrectionsRefresh
} from '@shared/season-resources'
import { db, toCachedFixtures, toCachedIncludedTeam, toCachedReferee } from './db'
import type { CachedFixture, CachedReferee, CachedVenue, SeasonScheduleQuery } from './db'
import { isFixtureOngoing } from '@/lib/fixture-state'

const directoryDuration = 24 * 60 * 60 * 1000
export interface SeasonRefereesQuery {
  seasonId: number
  refereeIds: number[]
  fetchedAt: number
  staleAt: number
}
export interface SeasonVenuesQuery {
  seasonId: number
  venueIds: number[]
  fetchedAt: number
  staleAt: number
}
export interface StandingCorrectionsQuery extends StandingCorrectionsRefresh {
  staleAt: number
}
export interface TeamScheduleQuery extends SeasonScheduleQuery {
  key: string
  teamId: number
}

export async function readSeasonReferees(
  seasonId: number
): Promise<(SeasonRefereesQuery & { referees: CachedReferee[] }) | null> {
  const query = await db.seasonRefereeQueries.get(seasonId)
  if (!query) return null
  const referees = (await db.referees.bulkGet(query.refereeIds)).filter(
    (item): item is CachedReferee => item !== undefined
  )
  return { ...query, referees }
}

export async function writeSeasonRefereesRefresh(
  seasonId: number,
  refresh: SeasonRefereesRefresh
): Promise<void> {
  if (seasonId !== refresh.seasonId) throw new Error('Referees do not match the selected season.')
  await db.transaction('rw', db.seasonRefereeQueries, db.referees, async () => {
    const previous = await db.seasonRefereeQueries.get(seasonId)
    if (previous && previous.fetchedAt > refresh.fetchedAt) return
    const values = [...new Map(refresh.referees.map((referee) => [referee.id, referee])).values()]
    const existing = await db.referees.bulkGet(values.map(({ id }) => id))
    await db.referees.bulkPut(
      values.map((referee, index) => {
        const cached = existing[index]
        return cached && cached.fetchedAt > refresh.fetchedAt
          ? cached
          : toCachedReferee(referee, refresh.fetchedAt, cached)
      })
    )
    await db.seasonRefereeQueries.put({
      seasonId,
      refereeIds: values.map(({ id }) => id),
      fetchedAt: refresh.fetchedAt,
      staleAt: refresh.fetchedAt + directoryDuration
    })
  })
}

export async function readSeasonVenues(
  seasonId: number
): Promise<(SeasonVenuesQuery & { venues: CachedVenue[] }) | null> {
  const query = await db.seasonVenueQueries.get(seasonId)
  if (!query) return null
  const venues = (await db.venues.bulkGet(query.venueIds)).filter(
    (item): item is CachedVenue => item !== undefined
  )
  return { ...query, venues }
}

export async function writeSeasonVenuesRefresh(
  seasonId: number,
  refresh: SeasonVenuesRefresh
): Promise<void> {
  if (seasonId !== refresh.seasonId) throw new Error('Venues do not match the selected season.')
  await db.transaction('rw', db.seasonVenueQueries, db.venues, async () => {
    const previous = await db.seasonVenueQueries.get(seasonId)
    if (previous && previous.fetchedAt > refresh.fetchedAt) return
    const values = [...new Map(refresh.venues.map((venue) => [venue.id, venue])).values()]
    const existing = await db.venues.bulkGet(values.map(({ id }) => id))
    await db.venues.bulkPut(
      values.map((venue, index) => {
        const cached = existing[index]
        if (cached && cached.fetchedAt > refresh.fetchedAt) return cached
        const raw = { ...cached?.raw, ...venue, country: venue.country ?? cached?.raw.country }
        return {
          id: venue.id,
          name: raw.name,
          countryId: raw.country_id ?? null,
          imagePath: raw.image_path ?? null,
          raw,
          fetchedAt: refresh.fetchedAt,
          staleAt: cached?.staleAt ?? refresh.fetchedAt
        }
      })
    )
    await db.seasonVenueQueries.put({
      seasonId,
      venueIds: values.map(({ id }) => id),
      fetchedAt: refresh.fetchedAt,
      staleAt: refresh.fetchedAt + directoryDuration
    })
  })
}

export async function readStandingCorrections(
  seasonId: number
): Promise<StandingCorrectionsQuery | null> {
  return (await db.standingCorrectionQueries.get(seasonId)) ?? null
}

export async function writeStandingCorrectionsRefresh(
  seasonId: number,
  refresh: StandingCorrectionsRefresh
): Promise<void> {
  if (
    seasonId !== refresh.seasonId ||
    refresh.corrections.some((row) => row.season_id !== seasonId)
  )
    throw new Error('Adjustments do not match the selected season.')
  await db.transaction('rw', db.standingCorrectionQueries, db.teams, async () => {
    const previous = await db.standingCorrectionQueries.get(seasonId)
    if (previous && previous.fetchedAt > refresh.fetchedAt) return
    const teams = refresh.corrections.flatMap(({ participant }) =>
      participant ? [participant] : []
    )
    const existing = await db.teams.bulkGet(teams.map(({ id }) => id))
    await db.teams.bulkPut(
      teams.map((team, index) => toCachedIncludedTeam(team, existing[index], refresh.fetchedAt))
    )
    await db.standingCorrectionQueries.put({
      ...refresh,
      staleAt: refresh.fetchedAt + 60 * 60 * 1000
    })
  })
}

export function teamScheduleQueryKey(input: RefreshTeamScheduleInput): string {
  return `${input.teamId}:${input.seasonId}`
}

export async function readTeamSchedule(
  input: RefreshTeamScheduleInput
): Promise<(TeamScheduleQuery & { fixtures: CachedFixture[] }) | null> {
  const query = await db.teamScheduleQueries.get(teamScheduleQueryKey(input))
  if (!query) return null
  const ids = [
    ...new Set(
      query.stages.flatMap((stage) => [
        ...stage.fixtureIds,
        ...stage.rounds.flatMap((round) => round.fixtureIds)
      ])
    )
  ]
  const fixtures = (await db.fixtures.bulkGet(ids)).filter(
    (fixture): fixture is CachedFixture => fixture !== undefined
  )
  return { ...query, fixtures }
}

export async function writeTeamScheduleRefresh(
  input: RefreshTeamScheduleInput,
  refresh: TeamScheduleRefresh
): Promise<void> {
  const allFixtures = refresh.stages.flatMap((stage) => [
    ...stage.fixtures,
    ...stage.rounds.flatMap((round) => round.fixtures)
  ])
  if (
    teamScheduleQueryKey(input) !== teamScheduleQueryKey(refresh) ||
    refresh.stages.some((stage) => stage.season_id !== input.seasonId) ||
    allFixtures.some(
      (fixture) =>
        fixture.season_id !== input.seasonId ||
        (!fixture.placeholder && !fixture.participants.some(({ id }) => id === input.teamId))
    )
  )
    throw new Error('Schedule does not match the selected team and season.')
  const fixtures = [...new Map(allFixtures.map((fixture) => [fixture.id, fixture])).values()]
  const staleAt =
    refresh.fetchedAt +
    (fixtures.some((fixture) => isFixtureOngoing(fixture.state_id)) ? 30_000 : 15 * 60 * 1000)
  const key = teamScheduleQueryKey(input)
  await db.transaction('rw', db.teamScheduleQueries, db.fixtures, async () => {
    const previous = await db.teamScheduleQueries.get(key)
    if (previous && previous.fetchedAt > refresh.fetchedAt) return
    await db.fixtures.bulkPut(await toCachedFixtures(fixtures, refresh.fetchedAt, staleAt))
    const stages = refresh.stages.map(({ fixtures, rounds, ...stage }) => ({
      ...stage,
      fixtureIds: fixtures.map(({ id }) => id),
      rounds: rounds.map(({ fixtures, ...round }) => ({
        ...round,
        fixtureIds: fixtures.map(({ id }) => id)
      }))
    }))
    await db.teamScheduleQueries.put({
      ...input,
      key,
      stages,
      fetchedAt: refresh.fetchedAt,
      staleAt
    })
  })
}
