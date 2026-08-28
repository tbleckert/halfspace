import Dexie, { type Table } from 'dexie'
import type {
  CompetitionRefresh,
  FixtureRefresh,
  RefreshCompetitionFixturesInput,
  StandingsRefresh,
  SportmonksCompetition,
  SportmonksFixture,
  SportmonksStanding
} from '@shared/contracts'
import { fixtureCacheExpiry } from '@/lib/date'

const subscribedCompetitionCatalog = 'subscribed'
const competitionCacheDuration = 24 * 60 * 60 * 1000
const standingsCacheDuration = 60 * 60 * 1000
const competitionFixturesCacheDuration = 15 * 60 * 1000

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
      db.competitionFixtureQueries
    ],
    async () => {
      await db.fixtures.clear()
      await db.fixtureQueries.clear()
      await db.competitions.clear()
      await db.competitionCatalogs.clear()
      await db.standings.clear()
      await db.standingQueries.clear()
      await db.competitionFixtureQueries.clear()
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
