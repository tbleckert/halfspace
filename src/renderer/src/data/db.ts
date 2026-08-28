import Dexie, { type Table } from 'dexie'
import type {
  CompetitionRefresh,
  FixtureRefresh,
  SportmonksCompetition,
  SportmonksFixture
} from '@shared/contracts'
import { fixtureCacheExpiry } from '@/lib/date'

const subscribedCompetitionCatalog = 'subscribed'
const competitionCacheDuration = 24 * 60 * 60 * 1000

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
  raw: SportmonksCompetition
  fetchedAt: number
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
    db.fixtureQueries,
    db.competitions,
    db.competitionCatalogs,
    async () => {
      await db.fixtureQueries.clear()
      await db.competitions.clear()
      await db.competitionCatalogs.clear()
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
