import Dexie, { type Table } from 'dexie'
import type {
  CompetitionRefresh,
  FixtureRefresh,
  RefreshCompetitionFixturesInput,
  RefreshTeamFixturesInput,
  StandingsRefresh,
  SportmonksCompetition,
  SportmonksFixture,
  SportmonksParticipant,
  SportmonksStanding,
  SportmonksTeam,
  SportmonksVenue,
  TeamRefresh,
  VenueRefresh
} from '@shared/contracts'
import { fixtureCacheExpiry } from '@/lib/date'

const subscribedCompetitionCatalog = 'subscribed'
const competitionCacheDuration = 24 * 60 * 60 * 1000
const standingsCacheDuration = 60 * 60 * 1000
const competitionFixturesCacheDuration = 15 * 60 * 1000
const teamCacheDuration = 24 * 60 * 60 * 1000
const teamFixturesCacheDuration = 15 * 60 * 1000
const venueCacheDuration = 24 * 60 * 60 * 1000

export interface CachedFixture {
  id: number
  leagueId: number
  seasonId: number
  stateId: number
  startingAt: number | null
  name: string | null
  resultInfo: string | null
  placeholder: boolean
  hasOdds: boolean
  homeTeamId: number | null
  awayTeamId: number | null
  raw: SportmonksFixture
  fetchedAt: number
  staleAt: number
}

export interface FixtureQuery {
  key: string
  date: string
  timeZone: string
  fixtureIds: number[]
  fetchedAt: number
  staleAt: number
  pageCount: number
  rateLimitRemaining?: number
  rateLimitResetsAt?: number
  message?: string
}

export interface CachedCompetition {
  id: number
  countryId: number
  name: string
  active: boolean
  imagePath: string | null
  currentSeasonId: number | null
  currentSeasonName: string | null
  raw: SportmonksCompetition
  fetchedAt: number
}

export interface CachedStanding {
  id: number
  participantId: number
  leagueId: number
  seasonId: number
  stageId: number
  groupId: number | null
  position: number
  raw: SportmonksStanding
  fetchedAt: number
}

export interface StandingQuery {
  seasonId: number
  standingIds: number[]
  fetchedAt: number
  staleAt: number
  rateLimitRemaining?: number
  rateLimitResetsAt?: number
  message?: string
}

export interface CompetitionFixtureQuery {
  key: string
  competitionId: number
  startDate: string
  endDate: string
  timeZone: string
  fixtureIds: number[]
  fetchedAt: number
  staleAt: number
  pageCount: number
  rateLimitRemaining?: number
  rateLimitResetsAt?: number
  message?: string
}

export interface CachedTeam {
  id: number
  countryId: number
  venueId: number | null
  name: string
  imagePath: string | null
  raw: SportmonksTeam
  fetchedAt: number
  staleAt: number
  rateLimitRemaining?: number
  rateLimitResetsAt?: number
  message?: string
}

export interface TeamFixtureQuery {
  key: string
  teamId: number
  startDate: string
  endDate: string
  timeZone: string
  fixtureIds: number[]
  fetchedAt: number
  staleAt: number
  pageCount: number
  rateLimitRemaining?: number
  rateLimitResetsAt?: number
  message?: string
}

export interface CachedVenue {
  id: number
  countryId: number | null
  name: string
  imagePath: string | null
  raw: SportmonksVenue
  fetchedAt: number
  staleAt: number
  rateLimitRemaining?: number
  rateLimitResetsAt?: number
  message?: string
}

export interface CompetitionCatalog {
  key: string
  competitionIds: number[]
  fetchedAt: number
  staleAt: number
  pageCount: number
  rateLimitRemaining?: number
  rateLimitResetsAt?: number
  message?: string
}

export interface CompetitionPin {
  competitionId: number
  pinnedAt: number
}

class HalfspaceDatabase extends Dexie {
  fixtures!: Table<CachedFixture, number>
  fixtureQueries!: Table<FixtureQuery, string>
  competitions!: Table<CachedCompetition, number>
  competitionCatalogs!: Table<CompetitionCatalog, string>
  competitionPins!: Table<CompetitionPin, number>
  standings!: Table<CachedStanding, number>
  standingQueries!: Table<StandingQuery, number>
  competitionFixtureQueries!: Table<CompetitionFixtureQuery, string>
  teams!: Table<CachedTeam, number>
  teamFixtureQueries!: Table<TeamFixtureQuery, string>
  venues!: Table<CachedVenue, number>

  constructor() {
    super('halfspace')

    this.version(1).stores({
      fixtures: 'id, leagueId, startingAt, [leagueId+startingAt], stateId, staleAt',
      fixtureQueries: '&key, date, staleAt'
    })

    this.version(2).stores({
      fixtures: 'id, leagueId, startingAt, [leagueId+startingAt], stateId, staleAt',
      fixtureQueries: '&key, date, staleAt',
      competitions: 'id, active, name, countryId',
      competitionCatalogs: '&key, staleAt',
      competitionPins: '&competitionId, pinnedAt'
    })

    this.version(3)
      .stores({
        fixtures: 'id, leagueId, startingAt, [leagueId+startingAt], stateId, staleAt',
        fixtureQueries: '&key, date, staleAt',
        competitions: 'id, active, name, countryId',
        competitionCatalogs: '&key, staleAt',
        competitionPins: '&competitionId, pinnedAt',
        standings: 'id, seasonId, [seasonId+position], leagueId, stageId, groupId',
        standingQueries: '&seasonId, staleAt',
        competitionFixtureQueries: '&key, competitionId, staleAt'
      })
      .upgrade(async (transaction) => {
        await transaction.table('competitions').clear()
        await transaction.table('competitionCatalogs').clear()
      })

    this.version(4).stores({
      fixtures:
        'id, leagueId, startingAt, [leagueId+startingAt], stateId, homeTeamId, awayTeamId, staleAt',
      fixtureQueries: '&key, date, staleAt',
      competitions: 'id, active, name, countryId',
      competitionCatalogs: '&key, staleAt',
      competitionPins: '&competitionId, pinnedAt',
      standings: 'id, participantId, seasonId, [seasonId+position], leagueId, stageId, groupId',
      standingQueries: '&seasonId, staleAt',
      competitionFixtureQueries: '&key, competitionId, staleAt',
      teams: 'id, name, countryId, staleAt',
      teamFixtureQueries: '&key, teamId, staleAt'
    })

    this.version(5).stores({
      fixtures:
        'id, leagueId, startingAt, [leagueId+startingAt], stateId, homeTeamId, awayTeamId, staleAt',
      fixtureQueries: '&key, date, staleAt',
      competitions: 'id, active, name, countryId',
      competitionCatalogs: '&key, staleAt',
      competitionPins: '&competitionId, pinnedAt',
      standings: 'id, participantId, seasonId, [seasonId+position], leagueId, stageId, groupId',
      standingQueries: '&seasonId, staleAt',
      competitionFixtureQueries: '&key, competitionId, staleAt',
      teams: 'id, name, countryId, venueId, staleAt',
      teamFixtureQueries: '&key, teamId, staleAt',
      venues: 'id, name, countryId, staleAt'
    })
  }
}

export const db = new HalfspaceDatabase()

export function fixtureQueryKey(date: string, timeZone: string): string {
  return `${date}|${timeZone}`
}

export async function readFixtureQuery(
  date: string,
  timeZone: string
): Promise<{ query: FixtureQuery | null; fixtures: CachedFixture[] }> {
  const query = await db.fixtureQueries.get(fixtureQueryKey(date, timeZone))
  if (!query) return { query: null, fixtures: [] }

  const fixtures = (await db.fixtures.bulkGet(query.fixtureIds)).filter(
    (fixture): fixture is CachedFixture => fixture !== undefined
  )

  return { query, fixtures }
}

export async function writeFixtureRefresh(
  date: string,
  timeZone: string,
  refresh: FixtureRefresh
): Promise<void> {
  const staleAt = fixtureCacheExpiry(date, timeZone, refresh.fetchedAt)
  const fixtures = refresh.fixtures.map((fixture) =>
    toCachedFixture(fixture, refresh.fetchedAt, staleAt)
  )
  const query: FixtureQuery = {
    key: fixtureQueryKey(date, timeZone),
    date,
    timeZone,
    fixtureIds: fixtures.map((fixture) => fixture.id),
    fetchedAt: refresh.fetchedAt,
    staleAt,
    pageCount: refresh.pageCount,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  }

  await db.transaction('rw', db.fixtures, db.fixtureQueries, async () => {
    await db.fixtures.bulkPut(fixtures)
    await db.fixtureQueries.put(query)
  })
}

export async function readCompetitionCatalog(): Promise<{
  catalog: CompetitionCatalog | null
  competitions: CachedCompetition[]
}> {
  const catalog = await db.competitionCatalogs.get(subscribedCompetitionCatalog)
  if (!catalog) return { catalog: null, competitions: [] }

  const competitions = (await db.competitions.bulkGet(catalog.competitionIds)).filter(
    (competition): competition is CachedCompetition => competition !== undefined
  )

  return { catalog, competitions }
}

export async function writeCompetitionRefresh(refresh: CompetitionRefresh): Promise<void> {
  const competitions = refresh.competitions.map((competition) => ({
    id: competition.id,
    countryId: competition.country_id,
    name: competition.name,
    active: competition.active,
    imagePath: competition.image_path ?? null,
    currentSeasonId: competition.currentseason?.id ?? null,
    currentSeasonName: competition.currentseason?.name ?? null,
    raw: competition,
    fetchedAt: refresh.fetchedAt
  }))
  const catalog: CompetitionCatalog = {
    key: subscribedCompetitionCatalog,
    competitionIds: competitions.map(({ id }) => id),
    fetchedAt: refresh.fetchedAt,
    staleAt: refresh.fetchedAt + competitionCacheDuration,
    pageCount: refresh.pageCount,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  }

  await db.transaction('rw', db.competitions, db.competitionCatalogs, async () => {
    await db.competitions.clear()
    await db.competitions.bulkPut(competitions)
    await db.competitionCatalogs.put(catalog)
  })
}

export async function readStandingsQuery(seasonId: number): Promise<{
  query: StandingQuery | null
  standings: CachedStanding[]
}> {
  const query = await db.standingQueries.get(seasonId)
  if (!query) return { query: null, standings: [] }

  const standings = (await db.standings.bulkGet(query.standingIds)).filter(
    (standing): standing is CachedStanding => standing !== undefined
  )

  return { query, standings }
}

export async function writeStandingsRefresh(
  seasonId: number,
  refresh: StandingsRefresh
): Promise<void> {
  const previousQuery = await db.standingQueries.get(seasonId)
  const standings = refresh.standings.map((standing) => ({
    id: standing.id,
    participantId: standing.participant_id,
    leagueId: standing.league_id,
    seasonId: standing.season_id,
    stageId: standing.stage_id,
    groupId: standing.group_id,
    position: standing.position,
    raw: standing,
    fetchedAt: refresh.fetchedAt
  }))
  const query: StandingQuery = {
    seasonId,
    standingIds: standings.map(({ id }) => id),
    fetchedAt: refresh.fetchedAt,
    staleAt: refresh.fetchedAt + standingsCacheDuration,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  }
  const removedStandingIds = (previousQuery?.standingIds ?? []).filter(
    (standingId) => !query.standingIds.includes(standingId)
  )

  await db.transaction('rw', db.standings, db.standingQueries, async () => {
    await db.standings.bulkDelete(removedStandingIds)
    await db.standings.bulkPut(standings)
    await db.standingQueries.put(query)
  })
}

export function competitionFixtureQueryKey(input: RefreshCompetitionFixturesInput): string {
  return `${input.competitionId}|${input.startDate}|${input.endDate}|${input.timeZone}`
}

export async function readCompetitionFixtureQuery(
  input: RefreshCompetitionFixturesInput
): Promise<{ query: CompetitionFixtureQuery | null; fixtures: CachedFixture[] }> {
  const query = await db.competitionFixtureQueries.get(competitionFixtureQueryKey(input))
  if (!query) return { query: null, fixtures: [] }

  const fixtures = (await db.fixtures.bulkGet(query.fixtureIds)).filter(
    (fixture): fixture is CachedFixture => fixture !== undefined
  )

  return { query, fixtures }
}

export async function writeCompetitionFixtureRefresh(
  input: RefreshCompetitionFixturesInput,
  refresh: FixtureRefresh
): Promise<void> {
  const staleAt = refresh.fetchedAt + competitionFixturesCacheDuration
  const fixtures = refresh.fixtures.map((fixture) =>
    toCachedFixture(fixture, refresh.fetchedAt, staleAt)
  )
  const query: CompetitionFixtureQuery = {
    key: competitionFixtureQueryKey(input),
    competitionId: input.competitionId,
    startDate: input.startDate,
    endDate: input.endDate,
    timeZone: input.timeZone,
    fixtureIds: fixtures.map(({ id }) => id),
    fetchedAt: refresh.fetchedAt,
    staleAt,
    pageCount: refresh.pageCount,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  }

  await db.transaction('rw', db.fixtures, db.competitionFixtureQueries, async () => {
    await db.fixtures.bulkPut(fixtures)
    await db.competitionFixtureQueries.put(query)
  })
}

export async function readTeamIdentity(teamId: number): Promise<{
  team: CachedTeam | null
  participant: SportmonksParticipant | null
}> {
  const team = await db.teams.get(teamId)
  if (team) {
    return {
      team,
      participant: {
        id: team.id,
        name: team.name,
        short_code: team.raw.short_code,
        image_path: team.imagePath ?? undefined
      }
    }
  }

  const standing = await db.standings.where('participantId').equals(teamId).first()
  if (standing?.raw.participant) {
    return { team: null, participant: standing.raw.participant }
  }

  const homeFixture = await db.fixtures.where('homeTeamId').equals(teamId).first()
  const awayFixture = homeFixture
    ? undefined
    : await db.fixtures.where('awayTeamId').equals(teamId).first()
  const participant = (homeFixture ?? awayFixture)?.raw.participants.find(({ id }) => id === teamId)

  return { team: null, participant: participant ?? null }
}

export async function readTeamStandings(teamId: number): Promise<CachedStanding[]> {
  return db.standings.where('participantId').equals(teamId).sortBy('position')
}

export async function writeTeamRefresh(refresh: TeamRefresh): Promise<void> {
  const team: CachedTeam = {
    id: refresh.team.id,
    countryId: refresh.team.country_id,
    venueId: refresh.team.venue_id ?? null,
    name: refresh.team.name,
    imagePath: refresh.team.image_path ?? null,
    raw: refresh.team,
    fetchedAt: refresh.fetchedAt,
    staleAt: refresh.fetchedAt + teamCacheDuration,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  }

  await db.teams.put(team)
}

export function teamFixtureQueryKey(input: RefreshTeamFixturesInput): string {
  return `${input.teamId}|${input.startDate}|${input.endDate}|${input.timeZone}`
}

export async function readTeamFixtureQuery(
  input: RefreshTeamFixturesInput
): Promise<{ query: TeamFixtureQuery | null; fixtures: CachedFixture[] }> {
  const query = await db.teamFixtureQueries.get(teamFixtureQueryKey(input))
  if (!query) return { query: null, fixtures: [] }

  const fixtures = (await db.fixtures.bulkGet(query.fixtureIds)).filter(
    (fixture): fixture is CachedFixture => fixture !== undefined
  )

  return { query, fixtures }
}

export async function writeTeamFixtureRefresh(
  input: RefreshTeamFixturesInput,
  refresh: FixtureRefresh
): Promise<void> {
  const staleAt = refresh.fetchedAt + teamFixturesCacheDuration
  const fixtures = refresh.fixtures.map((fixture) =>
    toCachedFixture(fixture, refresh.fetchedAt, staleAt)
  )
  const query: TeamFixtureQuery = {
    key: teamFixtureQueryKey(input),
    teamId: input.teamId,
    startDate: input.startDate,
    endDate: input.endDate,
    timeZone: input.timeZone,
    fixtureIds: fixtures.map(({ id }) => id),
    fetchedAt: refresh.fetchedAt,
    staleAt,
    pageCount: refresh.pageCount,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  }

  await db.transaction('rw', db.fixtures, db.teamFixtureQueries, async () => {
    await db.fixtures.bulkPut(fixtures)
    await db.teamFixtureQueries.put(query)
  })
}

export async function readVenueIdentity(venueId: number): Promise<{
  venue: CachedVenue | null
  summary: SportmonksVenue | null
}> {
  const venue = await db.venues.get(venueId)
  if (venue) return { venue, summary: venue.raw }

  const team = await db.teams.where('venueId').equals(venueId).first()
  const summary = team?.raw.venue?.id === venueId ? team.raw.venue : null

  return { venue: null, summary }
}

export async function readVenueTeams(venueId: number): Promise<CachedTeam[]> {
  return db.teams.where('venueId').equals(venueId).sortBy('name')
}

export async function writeVenueRefresh(refresh: VenueRefresh): Promise<void> {
  const venue: CachedVenue = {
    id: refresh.venue.id,
    countryId: refresh.venue.country_id ?? null,
    name: refresh.venue.name,
    imagePath: refresh.venue.image_path ?? null,
    raw: refresh.venue,
    fetchedAt: refresh.fetchedAt,
    staleAt: refresh.fetchedAt + venueCacheDuration,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  }

  await db.venues.put(venue)
}

export async function setCompetitionPinned(competitionId: number, pinned: boolean): Promise<void> {
  if (!pinned) {
    await db.competitionPins.delete(competitionId)
    return
  }

  await db.competitionPins.put({ competitionId, pinnedAt: Date.now() })
}

export async function clearSportmonksCache(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.fixtures,
      db.fixtureQueries,
      db.competitions,
      db.competitionCatalogs,
      db.standings,
      db.standingQueries,
      db.competitionFixtureQueries,
      db.teams,
      db.teamFixtureQueries,
      db.venues
    ],
    async () => {
      await db.fixtures.clear()
      await db.fixtureQueries.clear()
      await db.competitions.clear()
      await db.competitionCatalogs.clear()
      await db.standings.clear()
      await db.standingQueries.clear()
      await db.competitionFixtureQueries.clear()
      await db.teams.clear()
      await db.teamFixtureQueries.clear()
      await db.venues.clear()
    }
  )
}

function toCachedFixture(
  fixture: SportmonksFixture,
  fetchedAt: number,
  staleAt: number
): CachedFixture {
  return {
    id: fixture.id,
    leagueId: fixture.league_id,
    seasonId: fixture.season_id,
    stateId: fixture.state_id,
    startingAt:
      typeof fixture.starting_at_timestamp === 'number'
        ? fixture.starting_at_timestamp * 1000
        : null,
    name: fixture.name ?? null,
    resultInfo: fixture.result_info ?? null,
    placeholder: fixture.placeholder,
    hasOdds: fixture.has_odds,
    homeTeamId:
      fixture.participants.find((participant) => participant.meta?.location === 'home')?.id ?? null,
    awayTeamId:
      fixture.participants.find((participant) => participant.meta?.location === 'away')?.id ?? null,
    raw: fixture,
    fetchedAt,
    staleAt
  }
}
