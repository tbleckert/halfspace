import Dexie, { type Table } from 'dexie'
import type {
  CompetitionRefresh,
  FixtureDetailRefresh,
  FixtureOddsRefresh,
  FixtureRefresh,
  PlayerAppearancesRefresh,
  PlayerRefresh,
  RefreshCompetitionFixturesInput,
  RefreshPlayerAppearancesInput,
  RefreshTeamFixturesInput,
  StandingsRefresh,
  SportmonksCompetition,
  SportmonksFixture,
  SportmonksOdd,
  SportmonksParticipant,
  SportmonksPlayer,
  SportmonksStanding,
  SportmonksTeam,
  SportmonksVenue,
  TeamRefresh,
  TeamSquadRefresh,
  VenueRefresh
} from '@shared/contracts'
import { fixtureCacheExpiry } from '@/lib/date'
import { isFixtureLive } from '@/lib/fixture-state'

const subscribedCompetitionCatalog = 'subscribed'
const competitionCacheDuration = 24 * 60 * 60 * 1000
const standingsCacheDuration = 60 * 60 * 1000
const competitionFixturesCacheDuration = 15 * 60 * 1000
const teamCacheDuration = 24 * 60 * 60 * 1000
const teamFixturesCacheDuration = 15 * 60 * 1000
const venueCacheDuration = 24 * 60 * 60 * 1000
const teamSquadCacheDuration = 60 * 60 * 1000
const playerCacheDuration = 24 * 60 * 60 * 1000
const playerAppearancesCacheDuration = 15 * 60 * 1000
const fixtureDetailCacheDuration = 5 * 60 * 1000
const fixtureOddsCacheDuration = 5 * 60 * 1000
const liveFixtureCacheDuration = 30 * 1000

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
  detailStaleAt?: number
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

export interface CachedFixtureOdd {
  id: number
  fixtureId: number
  marketId: number
  bookmakerId: number
  raw: SportmonksOdd
  fetchedAt: number
}

export interface FixtureOddsQuery {
  fixtureId: number
  oddIds: number[]
  fetchedAt: number
  staleAt: number
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

export interface CachedPlayer {
  id: number
  name: string
  displayName: string
  imagePath: string | null
  positionId: number | null
  nationalityId: number | null
  raw: SportmonksPlayer
  detailed: boolean
  fetchedAt: number
  staleAt: number
  rateLimitRemaining?: number
  rateLimitResetsAt?: number
  message?: string
}

export interface CachedSquadEntry {
  id: number
  teamId: number
  playerId: number
  positionId: number | null
  detailedPositionId: number | null
  positionName: string | null
  detailedPositionName: string | null
  jerseyNumber: number | null
  start: string | null
  end: string | null
  fetchedAt: number
}

export interface TeamSquadQuery {
  teamId: number
  entryIds: number[]
  fetchedAt: number
  staleAt: number
  rateLimitRemaining?: number
  rateLimitResetsAt?: number
  message?: string
}

export interface SquadMember {
  entry: CachedSquadEntry
  player: CachedPlayer
}

export interface CachedPlayerAppearance {
  key: string
  playerId: number
  teamId: number
  fixtureId: number
  lineup: PlayerAppearancesRefresh['appearances'][number]['lineup']
  fetchedAt: number
}

export interface PlayerAppearanceQuery {
  key: string
  playerId: number
  teamId: number
  startDate: string
  endDate: string
  timeZone: string
  appearanceKeys: string[]
  fetchedAt: number
  staleAt: number
  pageCount: number
  rateLimitRemaining?: number
  rateLimitResetsAt?: number
  message?: string
}

export interface PlayerAppearanceRecord {
  appearance: CachedPlayerAppearance
  fixture: CachedFixture
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
  fixtureOdds!: Table<CachedFixtureOdd, number>
  fixtureOddsQueries!: Table<FixtureOddsQuery, number>
  competitions!: Table<CachedCompetition, number>
  competitionCatalogs!: Table<CompetitionCatalog, string>
  competitionPins!: Table<CompetitionPin, number>
  standings!: Table<CachedStanding, number>
  standingQueries!: Table<StandingQuery, number>
  competitionFixtureQueries!: Table<CompetitionFixtureQuery, string>
  teams!: Table<CachedTeam, number>
  teamFixtureQueries!: Table<TeamFixtureQuery, string>
  venues!: Table<CachedVenue, number>
  players!: Table<CachedPlayer, number>
  squadEntries!: Table<CachedSquadEntry, number>
  teamSquadQueries!: Table<TeamSquadQuery, number>
  playerAppearances!: Table<CachedPlayerAppearance, string>
  playerAppearanceQueries!: Table<PlayerAppearanceQuery, string>

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

    this.version(6).stores({
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
      venues: 'id, name, countryId, staleAt',
      players: 'id, name, displayName, positionId, nationalityId, staleAt',
      squadEntries: 'id, teamId, playerId, positionId, [teamId+positionId]',
      teamSquadQueries: '&teamId, staleAt',
      playerAppearances: '&key, playerId, teamId, fixtureId, [playerId+fixtureId]',
      playerAppearanceQueries: '&key, playerId, teamId, staleAt'
    })

    this.version(7).stores({
      fixtures:
        'id, leagueId, startingAt, [leagueId+startingAt], stateId, homeTeamId, awayTeamId, staleAt',
      fixtureQueries: '&key, date, staleAt',
      fixtureOdds: 'id, fixtureId, marketId, bookmakerId, [fixtureId+marketId]',
      fixtureOddsQueries: '&fixtureId, staleAt',
      competitions: 'id, active, name, countryId',
      competitionCatalogs: '&key, staleAt',
      competitionPins: '&competitionId, pinnedAt',
      standings: 'id, participantId, seasonId, [seasonId+position], leagueId, stageId, groupId',
      standingQueries: '&seasonId, staleAt',
      competitionFixtureQueries: '&key, competitionId, staleAt',
      teams: 'id, name, countryId, venueId, staleAt',
      teamFixtureQueries: '&key, teamId, staleAt',
      venues: 'id, name, countryId, staleAt',
      players: 'id, name, displayName, positionId, nationalityId, staleAt',
      squadEntries: 'id, teamId, playerId, positionId, [teamId+positionId]',
      teamSquadQueries: '&teamId, staleAt',
      playerAppearances: '&key, playerId, teamId, fixtureId, [playerId+fixtureId]',
      playerAppearanceQueries: '&key, playerId, teamId, staleAt'
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

export async function readFixtureIdentity(fixtureId: number): Promise<{
  fixture: CachedFixture | null
  competition: CachedCompetition | null
}> {
  const fixture = await db.fixtures.get(fixtureId)
  if (!fixture) return { fixture: null, competition: null }

  return {
    fixture,
    competition: (await db.competitions.get(fixture.leagueId)) ?? null
  }
}

export async function writeFixtureRefresh(
  date: string,
  timeZone: string,
  refresh: FixtureRefresh
): Promise<void> {
  const staleAt = fixtureRefreshExpiry(
    refresh.fixtures,
    refresh.fetchedAt,
    fixtureCacheExpiry(date, timeZone, refresh.fetchedAt)
  )
  const query: FixtureQuery = {
    key: fixtureQueryKey(date, timeZone),
    date,
    timeZone,
    fixtureIds: refresh.fixtures.map((fixture) => fixture.id),
    fetchedAt: refresh.fetchedAt,
    staleAt,
    pageCount: refresh.pageCount,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  }

  await db.transaction('rw', db.fixtures, db.fixtureQueries, async () => {
    const fixtures = await toCachedFixtures(refresh.fixtures, refresh.fetchedAt, staleAt)
    await db.fixtures.bulkPut(fixtures)
    await db.fixtureQueries.put(query)
  })
}

export async function writeFixtureDetailRefresh(refresh: FixtureDetailRefresh): Promise<void> {
  await db.transaction('rw', db.fixtures, async () => {
    const existing = await db.fixtures.get(refresh.fixture.id)
    const fixture = toCachedFixture(
      refresh.fixture,
      refresh.fetchedAt,
      existing?.staleAt ?? refresh.fetchedAt,
      existing,
      false
    )
    fixture.detailStaleAt =
      refresh.fetchedAt +
      (isFixtureLive(refresh.fixture.state_id)
        ? liveFixtureCacheDuration
        : fixtureDetailCacheDuration)
    await db.fixtures.put(fixture)
  })
}

export async function readFixtureOdds(fixtureId: number): Promise<{
  query: FixtureOddsQuery | null
  odds: CachedFixtureOdd[]
}> {
  const query = await db.fixtureOddsQueries.get(fixtureId)
  if (!query) return { query: null, odds: [] }

  const odds = (await db.fixtureOdds.bulkGet(query.oddIds)).filter(
    (odd): odd is CachedFixtureOdd => odd !== undefined
  )

  return { query, odds }
}

export async function writeFixtureOddsRefresh(
  fixtureId: number,
  refresh: FixtureOddsRefresh
): Promise<void> {
  const previousQuery = await db.fixtureOddsQueries.get(fixtureId)
  const odds: CachedFixtureOdd[] = refresh.odds.map((odd) => ({
    id: odd.id,
    fixtureId: odd.fixture_id,
    marketId: odd.market_id,
    bookmakerId: odd.bookmaker_id,
    raw: odd,
    fetchedAt: refresh.fetchedAt
  }))
  const query: FixtureOddsQuery = {
    fixtureId,
    oddIds: odds.map(({ id }) => id),
    fetchedAt: refresh.fetchedAt,
    staleAt: refresh.fetchedAt + fixtureOddsCacheDuration,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  }
  const removedOddIds = (previousQuery?.oddIds ?? []).filter(
    (oddId) => !query.oddIds.includes(oddId)
  )

  await db.transaction('rw', db.fixtureOdds, db.fixtureOddsQueries, async () => {
    await db.fixtureOdds.bulkDelete(removedOddIds)
    await db.fixtureOdds.bulkPut(odds)
    await db.fixtureOddsQueries.put(query)
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
  const staleAt = fixtureRefreshExpiry(
    refresh.fixtures,
    refresh.fetchedAt,
    refresh.fetchedAt + competitionFixturesCacheDuration
  )
  const query: CompetitionFixtureQuery = {
    key: competitionFixtureQueryKey(input),
    competitionId: input.competitionId,
    startDate: input.startDate,
    endDate: input.endDate,
    timeZone: input.timeZone,
    fixtureIds: refresh.fixtures.map(({ id }) => id),
    fetchedAt: refresh.fetchedAt,
    staleAt,
    pageCount: refresh.pageCount,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  }

  await db.transaction('rw', db.fixtures, db.competitionFixtureQueries, async () => {
    const fixtures = await toCachedFixtures(refresh.fixtures, refresh.fetchedAt, staleAt)
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

export async function readTeamSquad(teamId: number): Promise<{
  query: TeamSquadQuery | null
  members: SquadMember[]
}> {
  const query = await db.teamSquadQueries.get(teamId)
  if (!query) return { query: null, members: [] }

  const entries = (await db.squadEntries.bulkGet(query.entryIds)).filter(
    (entry): entry is CachedSquadEntry => entry !== undefined
  )
  const players = await db.players.bulkGet(entries.map(({ playerId }) => playerId))
  const members = entries.flatMap((entry, index) => {
    const player = players[index]
    return player ? [{ entry, player }] : []
  })

  return { query, members }
}

export async function writeTeamSquadRefresh(
  teamId: number,
  refresh: TeamSquadRefresh
): Promise<void> {
  const previousQuery = await db.teamSquadQueries.get(teamId)
  const squad = refresh.squad.filter(
    (entry): entry is typeof entry & { player: SportmonksPlayer } => Boolean(entry.player)
  )
  const existingPlayers = await db.players.bulkGet(squad.map(({ player_id }) => player_id))
  const players = squad.map(({ player }, index) =>
    toCachedSquadPlayer(player, existingPlayers[index], refresh.fetchedAt)
  )
  const entries: CachedSquadEntry[] = squad.map((entry) => ({
    id: entry.id,
    teamId: entry.team_id,
    playerId: entry.player_id,
    positionId: entry.position_id,
    detailedPositionId: entry.detailed_position_id,
    positionName: entry.position?.name ?? entry.player.position?.name ?? null,
    detailedPositionName:
      entry.detailedPosition?.name ?? entry.player.detailedPosition?.name ?? null,
    jerseyNumber: entry.jersey_number,
    start: entry.start,
    end: entry.end,
    fetchedAt: refresh.fetchedAt
  }))
  const query: TeamSquadQuery = {
    teamId,
    entryIds: entries.map(({ id }) => id),
    fetchedAt: refresh.fetchedAt,
    staleAt: refresh.fetchedAt + teamSquadCacheDuration,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  }
  const removedEntryIds = (previousQuery?.entryIds ?? []).filter(
    (entryId) => !query.entryIds.includes(entryId)
  )

  await db.transaction('rw', db.players, db.squadEntries, db.teamSquadQueries, async () => {
    await db.squadEntries.bulkDelete(removedEntryIds)
    await db.players.bulkPut(players)
    await db.squadEntries.bulkPut(entries)
    await db.teamSquadQueries.put(query)
  })
}

export async function readPlayerIdentity(playerId: number): Promise<{
  player: CachedPlayer | null
  teams: CachedTeam[]
}> {
  const [player, squadEntries] = await Promise.all([
    db.players.get(playerId),
    db.squadEntries.where('playerId').equals(playerId).toArray()
  ])
  const teams = (await db.teams.bulkGet(squadEntries.map(({ teamId }) => teamId))).filter(
    (team): team is CachedTeam => team !== undefined
  )

  return { player: player ?? null, teams: teams.toSorted((a, b) => a.name.localeCompare(b.name)) }
}

export async function writePlayerRefresh(refresh: PlayerRefresh): Promise<void> {
  const player: CachedPlayer = {
    id: refresh.player.id,
    name: refresh.player.name,
    displayName: refresh.player.display_name,
    imagePath: refresh.player.image_path ?? null,
    positionId: refresh.player.position_id,
    nationalityId: refresh.player.nationality_id,
    raw: refresh.player,
    detailed: true,
    fetchedAt: refresh.fetchedAt,
    staleAt: refresh.fetchedAt + playerCacheDuration,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  }

  await db.players.put(player)
}

export function playerAppearanceQueryKey(input: RefreshPlayerAppearancesInput): string {
  return `${input.playerId}|${input.teamId}|${input.startDate}|${input.endDate}|${input.timeZone}`
}

export async function readPlayerAppearanceQuery(input: RefreshPlayerAppearancesInput): Promise<{
  query: PlayerAppearanceQuery | null
  appearances: PlayerAppearanceRecord[]
}> {
  const query = await db.playerAppearanceQueries.get(playerAppearanceQueryKey(input))
  if (!query) return { query: null, appearances: [] }

  const cachedAppearances = (await db.playerAppearances.bulkGet(query.appearanceKeys)).filter(
    (appearance): appearance is CachedPlayerAppearance => appearance !== undefined
  )
  const fixtures = await db.fixtures.bulkGet(cachedAppearances.map(({ fixtureId }) => fixtureId))
  const appearances = cachedAppearances.flatMap((appearance, index) => {
    const fixture = fixtures[index]
    return fixture ? [{ appearance, fixture }] : []
  })

  return { query, appearances }
}

export async function writePlayerAppearancesRefresh(
  input: RefreshPlayerAppearancesInput,
  refresh: PlayerAppearancesRefresh
): Promise<void> {
  const key = playerAppearanceQueryKey(input)
  const staleAt = refresh.fetchedAt + playerAppearancesCacheDuration
  const appearances: CachedPlayerAppearance[] = refresh.appearances.map(({ fixture, lineup }) => ({
    key: `${input.playerId}|${fixture.id}`,
    playerId: input.playerId,
    teamId: input.teamId,
    fixtureId: fixture.id,
    lineup,
    fetchedAt: refresh.fetchedAt
  }))
  const query: PlayerAppearanceQuery = {
    key,
    playerId: input.playerId,
    teamId: input.teamId,
    startDate: input.startDate,
    endDate: input.endDate,
    timeZone: input.timeZone,
    appearanceKeys: appearances.map(({ key: appearanceKey }) => appearanceKey),
    fetchedAt: refresh.fetchedAt,
    staleAt,
    pageCount: refresh.pageCount,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  }
  await db.transaction(
    'rw',
    db.fixtures,
    db.playerAppearances,
    db.playerAppearanceQueries,
    async () => {
      const fixtures = await toCachedFixtures(
        refresh.appearances.map(({ fixture }) => fixture),
        refresh.fetchedAt,
        staleAt
      )
      await db.fixtures.bulkPut(fixtures)
      await db.playerAppearances.bulkPut(appearances)
      await db.playerAppearanceQueries.put(query)
    }
  )
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
  const staleAt = fixtureRefreshExpiry(
    refresh.fixtures,
    refresh.fetchedAt,
    refresh.fetchedAt + teamFixturesCacheDuration
  )
  const query: TeamFixtureQuery = {
    key: teamFixtureQueryKey(input),
    teamId: input.teamId,
    startDate: input.startDate,
    endDate: input.endDate,
    timeZone: input.timeZone,
    fixtureIds: refresh.fixtures.map(({ id }) => id),
    fetchedAt: refresh.fetchedAt,
    staleAt,
    pageCount: refresh.pageCount,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  }

  await db.transaction('rw', db.fixtures, db.teamFixtureQueries, async () => {
    const fixtures = await toCachedFixtures(refresh.fixtures, refresh.fetchedAt, staleAt)
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
  if (team?.raw.venue?.id === venueId) return { venue: null, summary: team.raw.venue }

  const fixture = await db.fixtures.filter(({ raw }) => raw.venue?.id === venueId).first()
  const summary = fixture?.raw.venue?.id === venueId ? fixture.raw.venue : null

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
      db.fixtureOdds,
      db.fixtureOddsQueries,
      db.competitions,
      db.competitionCatalogs,
      db.standings,
      db.standingQueries,
      db.competitionFixtureQueries,
      db.teams,
      db.teamFixtureQueries,
      db.venues,
      db.players,
      db.squadEntries,
      db.teamSquadQueries,
      db.playerAppearances,
      db.playerAppearanceQueries
    ],
    async () => {
      await db.fixtures.clear()
      await db.fixtureQueries.clear()
      await db.fixtureOdds.clear()
      await db.fixtureOddsQueries.clear()
      await db.competitions.clear()
      await db.competitionCatalogs.clear()
      await db.standings.clear()
      await db.standingQueries.clear()
      await db.competitionFixtureQueries.clear()
      await db.teams.clear()
      await db.teamFixtureQueries.clear()
      await db.venues.clear()
      await db.players.clear()
      await db.squadEntries.clear()
      await db.teamSquadQueries.clear()
      await db.playerAppearances.clear()
      await db.playerAppearanceQueries.clear()
    }
  )
}

function toCachedSquadPlayer(
  player: SportmonksPlayer,
  existing: CachedPlayer | undefined,
  fetchedAt: number
): CachedPlayer {
  const raw = existing?.detailed
    ? {
        ...existing.raw,
        ...player,
        country: player.country ?? existing.raw.country,
        nationality: player.nationality ?? existing.raw.nationality,
        position: player.position ?? existing.raw.position,
        detailedPosition: player.detailedPosition ?? existing.raw.detailedPosition
      }
    : player

  return {
    id: player.id,
    name: player.name,
    displayName: player.display_name,
    imagePath: player.image_path ?? null,
    positionId: player.position_id,
    nationalityId: player.nationality_id,
    raw,
    detailed: existing?.detailed ?? false,
    fetchedAt,
    staleAt: existing?.detailed ? existing.staleAt : fetchedAt,
    rateLimitRemaining: existing?.rateLimitRemaining,
    rateLimitResetsAt: existing?.rateLimitResetsAt,
    message: existing?.message
  }
}

function toCachedFixture(
  fixture: SportmonksFixture,
  fetchedAt: number,
  staleAt: number,
  existing?: CachedFixture,
  preserveDetail = true
): CachedFixture {
  const raw = preserveDetail ? mergeFixtureDetail(existing?.raw, fixture) : fixture

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
    raw,
    detailStaleAt: existing?.detailStaleAt,
    fetchedAt,
    staleAt
  }
}

async function toCachedFixtures(
  fixtures: SportmonksFixture[],
  fetchedAt: number,
  staleAt: number
): Promise<CachedFixture[]> {
  const existing = await db.fixtures.bulkGet(fixtures.map(({ id }) => id))
  return fixtures.map((fixture, index) =>
    toCachedFixture(fixture, fetchedAt, staleAt, existing[index])
  )
}

function mergeFixtureDetail(
  existing: SportmonksFixture | undefined,
  fixture: SportmonksFixture
): SportmonksFixture {
  if (!existing) return fixture

  return {
    ...existing,
    ...fixture,
    stage: fixture.stage ?? existing.stage,
    round: fixture.round ?? existing.round,
    venue: fixture.venue ?? existing.venue,
    lineups: fixture.lineups ?? existing.lineups,
    events: fixture.events ?? existing.events,
    statistics: fixture.statistics ?? existing.statistics
  }
}

function fixtureRefreshExpiry(
  fixtures: SportmonksFixture[],
  fetchedAt: number,
  defaultStaleAt: number
): number {
  return fixtures.some(({ state_id }) => isFixtureLive(state_id))
    ? fetchedAt + liveFixtureCacheDuration
    : defaultStaleAt
}
