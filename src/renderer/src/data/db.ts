import Dexie, { type Table } from 'dexie'
import type {
  FixtureTvRefresh,
  FixturePressureRefresh,
  SubscriptionRefresh,
  TeamOfWeekRefresh,
  RefreshTeamOfWeekInput,
  OddsFeed
} from '@shared/contracts'
import type {
  TeamRivalsRefresh,
  FixtureCommentaryRefresh,
  SeasonScheduleRefresh,
  SportmonksScheduleStage,
  SportmonksScheduleRound,
  RefereeRefresh,
  SportmonksReferee,
  CoachRefresh,
  CompetitionRefresh,
  CompetitionSeasonsRefresh,
  EntitySearchRefresh,
  FixtureDetailRefresh,
  FixtureOddsRefresh,
  FixtureRefresh,
  PlayerAppearancesRefresh,
  PlayerRefresh,
  PlayerStatisticsRefresh,
  TransfersRefresh,
  RefreshCompetitionFixturesInput,
  RefreshFixtureHeadToHeadInput,
  RefreshPlayerAppearancesInput,
  RefreshPlayerStatisticsInput,
  RefreshPlayerTransfersInput,
  RefreshTeamFixturesInput,
  RefreshTeamStatisticsInput,
  RefreshTeamTransfersInput,
  SeasonStatisticsRefresh,
  SeasonTopscorersRefresh,
  StandingsRefresh,
  SportmonksCompetition,
  SportmonksCoach,
  SportmonksFixture,
  SportmonksOdd,
  SportmonksParticipant,
  SportmonksPlayer,
  SportmonksSeason,
  SportmonksStanding,
  SportmonksTeam,
  SportmonksVenue,
  SportmonksTransfer,
  TeamRefresh,
  TeamSquadRefresh,
  TeamStatisticsRefresh,
  VenueRefresh
} from '@shared/contracts'
import { fixtureCacheExpiry, isoDateInTimeZone } from '@/lib/date'
import { isFixtureOngoing } from '@/lib/fixture-state'

const subscribedCompetitionCatalog = 'subscribed'
const competitionCacheDuration = 24 * 60 * 60 * 1000
const competitionSeasonsCacheDuration = 24 * 60 * 60 * 1000
const standingsCacheDuration = 60 * 60 * 1000
const statisticsCacheDuration = 60 * 60 * 1000
const competitionFixturesCacheDuration = 15 * 60 * 1000
const teamCacheDuration = 60 * 60 * 1000
const teamFixturesCacheDuration = 15 * 60 * 1000
const venueCacheDuration = 24 * 60 * 60 * 1000
const teamSquadCacheDuration = 60 * 60 * 1000
const playerCacheDuration = 24 * 60 * 60 * 1000
const coachCacheDuration = 24 * 60 * 60 * 1000
const refereeCacheDuration = 24 * 60 * 60 * 1000
const playerAppearancesCacheDuration = 15 * 60 * 1000
const transfersCacheDuration = 24 * 60 * 60 * 1000
const fixtureDetailCacheDuration = 5 * 60 * 1000
const fixtureOddsCacheDuration = 5 * 60 * 1000
const fixtureHeadToHeadCacheDuration = 6 * 60 * 60 * 1000
const liveFixtureCacheDuration = 30 * 1000
const entityTypeOrder: Record<EntitySearchResultType, number> = {
  competition: 0,
  team: 1,
  fixture: 2,
  player: 3,
  coach: 4,
  referee: 5,
  venue: 6
}

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

export interface CachedReferee {
  id: number
  raw: Omit<SportmonksReferee, 'latest'>
  detailed: boolean
  appointments: { fixtureId: number; role: string }[]
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

export interface FixtureHeadToHeadQuery {
  key: string
  firstTeamId: number
  secondTeamId: number
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

export interface SeasonStatisticsQuery {
  seasonId: number
  statistics: SeasonStatisticsRefresh['statistics']
  fetchedAt: number
  staleAt: number
  rateLimitRemaining?: number
  rateLimitResetsAt?: number
  message?: string
}

export interface SeasonTopscorersQuery extends SeasonTopscorersRefresh {
  seasonId: number
  staleAt: number
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
  countryId: number | null
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

export interface TeamStatisticsQuery {
  key: string
  teamId: number
  seasonId: number
  statistics: TeamStatisticsRefresh['statistics']
  fetchedAt: number
  staleAt: number
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

export interface CachedCoach {
  id: number
  name: string
  displayName: string
  imagePath: string | null
  nationalityId: number | null
  raw: SportmonksCoach
  detailed: boolean
  fetchedAt: number
  staleAt: number
  rateLimitRemaining?: number
  rateLimitResetsAt?: number
  message?: string
}

export interface CoachTeamRecord {
  assignment: NonNullable<SportmonksCoach['teams']>[number]
  team: CachedTeam
}

export type EntitySearchResultType =
  'competition' | 'team' | 'fixture' | 'player' | 'coach' | 'referee' | 'venue'

export interface EntitySearchResult {
  id: number
  type: EntitySearchResultType
  name: string
  subtitle: string | null
  imagePath: string | null
  fixture?: CachedFixture
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
  seasonId?: number
  entryIds: number[]
  fetchedAt: number
  staleAt: number
  rateLimitRemaining?: number
  rateLimitResetsAt?: number
  message?: string
}

export interface TeamSeasonSquadQuery extends TeamSquadQuery {
  key: string
  entries: CachedSquadEntry[]
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

export interface PlayerStatisticsQuery {
  key: string
  playerId: number
  seasonId: number
  statistics: PlayerStatisticsRefresh['statistics']
  fetchedAt: number
  staleAt: number
  rateLimitRemaining?: number
  rateLimitResetsAt?: number
  message?: string
}

export interface CachedTransfer {
  id: number
  playerId: number
  fromTeamId: number | null
  toTeamId: number | null
  date: string
  raw: SportmonksTransfer
  fetchedAt: number
}

export interface PlayerTransferQuery {
  playerId: number
  transferIds: number[]
  fetchedAt: number
  staleAt: number
  pageCount: number
  rateLimitRemaining?: number
  rateLimitResetsAt?: number
  message?: string
}

export interface TeamTransferQuery {
  teamId: number
  transferIds: number[]
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

export interface CompetitionSeasonQuery {
  competitionId: number
  seasons: SportmonksSeason[]
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

export interface CachedScheduleRound extends Omit<SportmonksScheduleRound, 'fixtures'> {
  fixtureIds: number[]
}

export interface CachedScheduleStage extends Omit<SportmonksScheduleStage, 'fixtures' | 'rounds'> {
  fixtureIds: number[]
  rounds: CachedScheduleRound[]
}

export interface SeasonScheduleQuery {
  seasonId: number
  stages: CachedScheduleStage[]
  fetchedAt: number
  staleAt: number
}

export interface FixtureCommentaryQuery extends FixtureCommentaryRefresh {
  fixtureId: number
  staleAt: number
}

export interface TeamRivalsQuery {
  teamId: number
  rivalIds: number[]
  fetchedAt: number
  staleAt: number
}

export interface SubscriptionQuery extends SubscriptionRefresh {
  key: string
  staleAt: number
}

export interface FixtureTvQuery extends FixtureTvRefresh {
  fixtureId: number
  staleAt: number
}

export interface FixturePressureQuery extends FixturePressureRefresh {
  fixtureId: number
  staleAt: number
}

export interface TeamOfWeekQuery extends TeamOfWeekRefresh {
  key: string
  staleAt: number
}

class HalfspaceDatabase extends Dexie {
  subscriptionQueries!: Table<SubscriptionQuery, string>
  fixtureTvQueries!: Table<FixtureTvQuery, number>
  fixturePressureQueries!: Table<FixturePressureQuery, number>
  teamOfWeekQueries!: Table<TeamOfWeekQuery, string>
  teamRivalsQueries!: Table<TeamRivalsQuery, number>
  fixtureCommentaryQueries!: Table<FixtureCommentaryQuery, number>
  seasonScheduleQueries!: Table<SeasonScheduleQuery, number>
  fixtures!: Table<CachedFixture, number>
  fixtureQueries!: Table<FixtureQuery, string>
  fixtureOdds!: Table<CachedFixtureOdd, number>
  fixtureOddsQueries!: Table<FixtureOddsQuery, number>
  fixtureInplayOdds!: Table<CachedFixtureOdd, number>
  fixtureInplayOddsQueries!: Table<FixtureOddsQuery, number>
  fixtureHeadToHeadQueries!: Table<FixtureHeadToHeadQuery, string>
  competitions!: Table<CachedCompetition, number>
  competitionCatalogs!: Table<CompetitionCatalog, string>
  competitionPins!: Table<CompetitionPin, number>
  competitionSeasonQueries!: Table<CompetitionSeasonQuery, number>
  standings!: Table<CachedStanding, number>
  standingQueries!: Table<StandingQuery, number>
  seasonStatisticsQueries!: Table<SeasonStatisticsQuery, number>
  seasonTopscorersQueries!: Table<SeasonTopscorersQuery, number>
  competitionFixtureQueries!: Table<CompetitionFixtureQuery, string>
  teams!: Table<CachedTeam, number>
  teamFixtureQueries!: Table<TeamFixtureQuery, string>
  teamStatisticsQueries!: Table<TeamStatisticsQuery, string>
  venues!: Table<CachedVenue, number>
  players!: Table<CachedPlayer, number>
  coaches!: Table<CachedCoach, number>
  referees!: Table<CachedReferee, number>
  squadEntries!: Table<CachedSquadEntry, number>
  teamSquadQueries!: Table<TeamSquadQuery, number>
  teamSeasonSquadQueries!: Table<TeamSeasonSquadQuery, string>
  playerAppearances!: Table<CachedPlayerAppearance, string>
  playerAppearanceQueries!: Table<PlayerAppearanceQuery, string>
  playerStatisticsQueries!: Table<PlayerStatisticsQuery, string>
  transfers!: Table<CachedTransfer, number>
  playerTransferQueries!: Table<PlayerTransferQuery, number>
  teamTransferQueries!: Table<TeamTransferQuery, number>

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

    this.version(8).stores({
      fixtures:
        'id, leagueId, startingAt, [leagueId+startingAt], stateId, homeTeamId, awayTeamId, staleAt',
      fixtureQueries: '&key, date, staleAt',
      fixtureOdds: 'id, fixtureId, marketId, bookmakerId, [fixtureId+marketId]',
      fixtureOddsQueries: '&fixtureId, staleAt',
      competitions: 'id, active, name, countryId',
      competitionCatalogs: '&key, staleAt',
      competitionPins: '&competitionId, pinnedAt',
      competitionSeasonQueries: '&competitionId, staleAt',
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

    this.version(9).stores({
      fixtures:
        'id, leagueId, startingAt, [leagueId+startingAt], stateId, homeTeamId, awayTeamId, staleAt',
      fixtureQueries: '&key, date, staleAt',
      fixtureOdds: 'id, fixtureId, marketId, bookmakerId, [fixtureId+marketId]',
      fixtureOddsQueries: '&fixtureId, staleAt',
      competitions: 'id, active, name, countryId',
      competitionCatalogs: '&key, staleAt',
      competitionPins: '&competitionId, pinnedAt',
      competitionSeasonQueries: '&competitionId, staleAt',
      standings: 'id, participantId, seasonId, [seasonId+position], leagueId, stageId, groupId',
      standingQueries: '&seasonId, staleAt',
      seasonStatisticsQueries: '&seasonId, staleAt',
      competitionFixtureQueries: '&key, competitionId, staleAt',
      teams: 'id, name, countryId, venueId, staleAt',
      teamFixtureQueries: '&key, teamId, staleAt',
      teamStatisticsQueries: '&key, teamId, seasonId, staleAt',
      venues: 'id, name, countryId, staleAt',
      players: 'id, name, displayName, positionId, nationalityId, staleAt',
      squadEntries: 'id, teamId, playerId, positionId, [teamId+positionId]',
      teamSquadQueries: '&teamId, staleAt',
      playerAppearances: '&key, playerId, teamId, fixtureId, [playerId+fixtureId]',
      playerAppearanceQueries: '&key, playerId, teamId, staleAt'
    })

    this.version(10).stores({
      fixtures:
        'id, leagueId, startingAt, [leagueId+startingAt], stateId, homeTeamId, awayTeamId, staleAt',
      fixtureQueries: '&key, date, staleAt',
      fixtureOdds: 'id, fixtureId, marketId, bookmakerId, [fixtureId+marketId]',
      fixtureOddsQueries: '&fixtureId, staleAt',
      fixtureHeadToHeadQueries: '&key, firstTeamId, secondTeamId, staleAt',
      competitions: 'id, active, name, countryId',
      competitionCatalogs: '&key, staleAt',
      competitionPins: '&competitionId, pinnedAt',
      competitionSeasonQueries: '&competitionId, staleAt',
      standings: 'id, participantId, seasonId, [seasonId+position], leagueId, stageId, groupId',
      standingQueries: '&seasonId, staleAt',
      seasonStatisticsQueries: '&seasonId, staleAt',
      competitionFixtureQueries: '&key, competitionId, staleAt',
      teams: 'id, name, countryId, venueId, staleAt',
      teamFixtureQueries: '&key, teamId, staleAt',
      teamStatisticsQueries: '&key, teamId, seasonId, staleAt',
      venues: 'id, name, countryId, staleAt',
      players: 'id, name, displayName, positionId, nationalityId, staleAt',
      squadEntries: 'id, teamId, playerId, positionId, [teamId+positionId]',
      teamSquadQueries: '&teamId, staleAt',
      playerAppearances: '&key, playerId, teamId, fixtureId, [playerId+fixtureId]',
      playerAppearanceQueries: '&key, playerId, teamId, staleAt'
    })

    this.version(11).stores({
      fixtures:
        'id, leagueId, startingAt, [leagueId+startingAt], stateId, homeTeamId, awayTeamId, staleAt',
      fixtureQueries: '&key, date, staleAt',
      fixtureOdds: 'id, fixtureId, marketId, bookmakerId, [fixtureId+marketId]',
      fixtureOddsQueries: '&fixtureId, staleAt',
      fixtureHeadToHeadQueries: '&key, firstTeamId, secondTeamId, staleAt',
      competitions: 'id, active, name, countryId',
      competitionCatalogs: '&key, staleAt',
      competitionPins: '&competitionId, pinnedAt',
      competitionSeasonQueries: '&competitionId, staleAt',
      standings: 'id, participantId, seasonId, [seasonId+position], leagueId, stageId, groupId',
      standingQueries: '&seasonId, staleAt',
      seasonStatisticsQueries: '&seasonId, staleAt',
      competitionFixtureQueries: '&key, competitionId, staleAt',
      teams: 'id, name, countryId, venueId, staleAt',
      teamFixtureQueries: '&key, teamId, staleAt',
      teamStatisticsQueries: '&key, teamId, seasonId, staleAt',
      venues: 'id, name, countryId, staleAt',
      players: 'id, name, displayName, positionId, nationalityId, staleAt',
      squadEntries: 'id, teamId, playerId, positionId, [teamId+positionId]',
      teamSquadQueries: '&teamId, staleAt',
      playerAppearances: '&key, playerId, teamId, fixtureId, [playerId+fixtureId]',
      playerAppearanceQueries: '&key, playerId, teamId, staleAt',
      playerStatisticsQueries: '&key, playerId, seasonId, staleAt'
    })

    this.version(12).stores({
      transfers: 'id, playerId, fromTeamId, toTeamId, date',
      playerTransferQueries: '&playerId, staleAt'
    })

    this.version(13).stores({
      teamTransferQueries: '&teamId, staleAt'
    })

    this.version(14).stores({
      coaches: 'id, name, displayName, nationalityId, staleAt'
    })

    this.version(15).stores({
      seasonTopscorersQueries: '&seasonId, staleAt'
    })

    this.version(16).stores({
      teamSeasonSquadQueries: '&key, teamId, seasonId, staleAt'
    })
    this.version(17).stores({
      referees: 'id, staleAt'
    })
    this.version(18).stores({
      seasonScheduleQueries: '&seasonId, staleAt'
    })
    this.version(19).stores({
      fixtureCommentaryQueries: '&fixtureId, staleAt'
    })
    this.version(20).stores({
      teamRivalsQueries: '&teamId, staleAt'
    })
    this.version(21).stores({
      subscriptionQueries: '&key, staleAt'
    })
    this.version(22).stores({
      fixtureTvQueries: '&fixtureId, staleAt'
    })
    this.version(23).stores({
      teamOfWeekQueries: '&key, staleAt'
    })
    this.version(24).stores({
      fixtureInplayOdds: '&id, fixtureId',
      fixtureInplayOddsQueries: '&fixtureId, staleAt'
    })
    this.version(25).stores({
      fixturePressureQueries: '&fixtureId, staleAt'
    })
  }
}

export const db = new HalfspaceDatabase()

export function teamOfWeekQueryKey(input: RefreshTeamOfWeekInput): string {
  return `${input.competitionId}:${input.roundId ?? 'latest'}`
}

export async function readTeamOfWeek(
  input: RefreshTeamOfWeekInput
): Promise<TeamOfWeekQuery | null> {
  return (await db.teamOfWeekQueries.get(teamOfWeekQueryKey(input))) ?? null
}

export async function writeTeamOfWeekRefresh(
  input: RefreshTeamOfWeekInput,
  refresh: TeamOfWeekRefresh
): Promise<void> {
  await db.transaction('rw', db.teamOfWeekQueries, db.players, db.teams, async () => {
    const players = [
      ...new Map(
        refresh.entries.flatMap((entry) =>
          entry.player ? [[entry.player.id, entry.player] as const] : []
        )
      ).values()
    ]
    const teams = [
      ...new Map(
        refresh.entries.flatMap((entry) =>
          entry.team ? [[entry.team.id, entry.team] as const] : []
        )
      ).values()
    ]
    const existingPlayers = await db.players.bulkGet(players.map((player) => player.id))
    const existingTeams = await db.teams.bulkGet(teams.map((team) => team.id))
    await db.players.bulkPut(
      players.map((player, index) =>
        toCachedIncludedPlayer(player, existingPlayers[index], refresh.fetchedAt)
      )
    )
    await db.teams.bulkPut(
      teams.map((team, index) =>
        toCachedIncludedTeam(team, existingTeams[index], refresh.fetchedAt)
      )
    )
    await db.teamOfWeekQueries.put({
      ...refresh,
      key: teamOfWeekQueryKey(input),
      staleAt: refresh.fetchedAt + 60 * 60 * 1000
    })
  })
}

export async function readSubscription(): Promise<SubscriptionQuery | null> {
  return (await db.subscriptionQueries.get('current')) ?? null
}

export async function readFixtureTv(fixtureId: number): Promise<FixtureTvQuery | null> {
  return (await db.fixtureTvQueries.get(fixtureId)) ?? null
}

export async function readFixturePressure(fixtureId: number): Promise<FixturePressureQuery | null> {
  return (await db.fixturePressureQueries.get(fixtureId)) ?? null
}

export async function writeFixturePressureRefresh(
  fixtureId: number,
  refresh: FixturePressureRefresh
): Promise<void> {
  await db.transaction('rw', db.fixturePressureQueries, async () => {
    const existing = await db.fixturePressureQueries.get(fixtureId)
    if (existing && existing.fetchedAt > refresh.fetchedAt) return
    await db.fixturePressureQueries.put({
      ...refresh,
      fixtureId,
      staleAt: refresh.fetchedAt + 60 * 60 * 1000
    })
  })
}

export async function writeFixtureTvRefresh(
  fixtureId: number,
  refresh: FixtureTvRefresh
): Promise<void> {
  await db.fixtureTvQueries.put({
    ...refresh,
    fixtureId,
    staleAt: refresh.fetchedAt + 60 * 60 * 1000
  })
}

export async function writeSubscriptionRefresh(refresh: SubscriptionRefresh): Promise<void> {
  await db.subscriptionQueries.put({
    ...refresh,
    key: 'current',
    staleAt: refresh.fetchedAt + 60 * 60 * 1000
  })
}

export async function readTeamRivals(
  teamId: number
): Promise<(TeamRivalsQuery & { rivals: { id: number; team: CachedTeam | null }[] }) | null> {
  const query = await db.teamRivalsQueries.get(teamId)
  if (!query) return null
  const teams = await db.teams.bulkGet(query.rivalIds)
  return {
    ...query,
    rivals: query.rivalIds.map((id, index) => ({ id, team: teams[index] ?? null }))
  }
}

export async function writeTeamRivalsRefresh(
  teamId: number,
  refresh: TeamRivalsRefresh
): Promise<void> {
  const relevant = refresh.rivals.filter(
    (rival) => rival.team_id === teamId || rival.rival_id === teamId
  )
  const rivalIds = [
    ...new Set(relevant.map((rival) => (rival.team_id === teamId ? rival.rival_id : rival.team_id)))
  ].filter((id) => id !== teamId)
  const teams = [
    ...new Map(
      relevant
        .flatMap((rival) => [rival.team, rival.rival])
        .filter((team): team is SportmonksTeam => Boolean(team))
        .map((team) => [team.id, team])
    ).values()
  ]
  await db.transaction('rw', db.teams, db.teamRivalsQueries, async () => {
    const existing = await db.teams.bulkGet(teams.map((team) => team.id))
    await db.teams.bulkPut(
      teams.map((team, index) => toCachedIncludedTeam(team, existing[index], refresh.fetchedAt))
    )
    await db.teamRivalsQueries.put({
      teamId,
      rivalIds,
      fetchedAt: refresh.fetchedAt,
      staleAt: refresh.fetchedAt + 24 * 60 * 60 * 1000
    })
  })
}

export async function readFixtureCommentary(
  fixtureId: number
): Promise<FixtureCommentaryQuery | null> {
  return (await db.fixtureCommentaryQueries.get(fixtureId)) ?? null
}

export async function writeFixtureCommentaryRefresh(
  fixtureId: number,
  refresh: FixtureCommentaryRefresh
): Promise<void> {
  await db.transaction('rw', db.fixtureCommentaryQueries, db.fixtures, db.players, async () => {
    const fixture = await db.fixtures.get(fixtureId)
    const players = [
      ...new Map(
        refresh.commentaries
          .flatMap((item) => [item.player, item.relatedPlayer])
          .filter((player): player is SportmonksPlayer => Boolean(player))
          .map((player) => [player.id, player])
      ).values()
    ]
    const existing = await db.players.bulkGet(players.map((player) => player.id))
    await db.players.bulkPut(
      players.map((player, index) =>
        toCachedIncludedPlayer(player, existing[index], refresh.fetchedAt)
      )
    )
    await db.fixtureCommentaryQueries.put({
      ...refresh,
      fixtureId,
      staleAt:
        refresh.fetchedAt +
        (fixture && isFixtureOngoing(fixture.stateId)
          ? liveFixtureCacheDuration
          : fixtureDetailCacheDuration)
    })
  })
}

export async function readSeasonSchedule(
  seasonId: number
): Promise<(SeasonScheduleQuery & { fixtures: CachedFixture[] }) | null> {
  const query = await db.seasonScheduleQueries.get(seasonId)
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

export async function writeSeasonScheduleRefresh(
  seasonId: number,
  refresh: SeasonScheduleRefresh
): Promise<void> {
  const allFixtures = refresh.stages.flatMap((stage) => [
    ...stage.fixtures,
    ...stage.rounds.flatMap((round) => round.fixtures)
  ])
  const uniqueFixtures = [...new Map(allFixtures.map((fixture) => [fixture.id, fixture])).values()]
  const staleAt = fixtureRefreshExpiry(
    uniqueFixtures,
    refresh.fetchedAt,
    refresh.fetchedAt + competitionFixturesCacheDuration
  )
  const stages = refresh.stages.map(({ fixtures, rounds, ...stage }) => ({
    ...stage,
    fixtureIds: fixtures.map((fixture) => fixture.id),
    rounds: rounds.map(({ fixtures, ...round }) => ({
      ...round,
      fixtureIds: fixtures.map((fixture) => fixture.id)
    }))
  }))
  await db.transaction('rw', db.seasonScheduleQueries, db.fixtures, async () => {
    await db.fixtures.bulkPut(await toCachedFixtures(uniqueFixtures, refresh.fetchedAt, staleAt))
    await db.seasonScheduleQueries.put({
      seasonId,
      stages,
      fetchedAt: refresh.fetchedAt,
      staleAt
    })
  })
}

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
    const existingQuery = await db.fixtureQueries.get(query.key)
    if (existingQuery && existingQuery.fetchedAt > refresh.fetchedAt) return
    const fixtures = await toCachedFixtures(refresh.fixtures, refresh.fetchedAt, staleAt)
    await db.fixtures.bulkPut(fixtures)
    await db.fixtureQueries.put(query)
  })
}

export async function writeFixtureWindowRefresh(
  dates: string[],
  timeZone: string,
  refresh: FixtureRefresh
): Promise<void> {
  const fixturesByDate = new Map(dates.map((date) => [date, [] as SportmonksFixture[]]))

  for (const fixture of refresh.fixtures) {
    if (typeof fixture.starting_at_timestamp !== 'number') continue

    const date = isoDateInTimeZone(fixture.starting_at_timestamp * 1_000, timeZone)
    fixturesByDate.get(date)?.push(fixture)
  }

  await db.transaction('rw', db.fixtures, db.fixtureQueries, async () => {
    for (const date of dates) {
      const key = fixtureQueryKey(date, timeZone)
      const existingQuery = await db.fixtureQueries.get(key)
      if (existingQuery && existingQuery.fetchedAt > refresh.fetchedAt) continue
      const fixtures = fixturesByDate.get(date) ?? []
      const staleAt = fixtureRefreshExpiry(
        fixtures,
        refresh.fetchedAt,
        fixtureCacheExpiry(date, timeZone, refresh.fetchedAt)
      )
      const cachedFixtures = await toCachedFixtures(fixtures, refresh.fetchedAt, staleAt)

      await db.fixtures.bulkPut(cachedFixtures)
      await db.fixtureQueries.put({
        key,
        date,
        timeZone,
        fixtureIds: fixtures.map(({ id }) => id),
        fetchedAt: refresh.fetchedAt,
        staleAt,
        pageCount: refresh.pageCount,
        rateLimitRemaining: refresh.rateLimit?.remaining,
        rateLimitResetsAt: refresh.rateLimit?.resetsAt,
        message: refresh.message
      })
    }
  })
}

export async function writeFixtureDetailRefresh(refresh: FixtureDetailRefresh): Promise<void> {
  const fixtureCoaches = refresh.fixture.coaches ?? []

  const fixtureReferees = (refresh.fixture.referees ?? []).flatMap(({ referee }) =>
    referee ? [referee] : []
  )
  const includedPlayers = (refresh.fixture.sidelined ?? []).flatMap(({ player }) =>
    player ? [player] : []
  )
  await db.transaction('rw', db.fixtures, db.coaches, db.referees, db.players, async () => {
    const existingCoaches = await db.coaches.bulkGet(fixtureCoaches.map(({ id }) => id))
    const coaches = fixtureCoaches.map((coach, index) =>
      toCachedCoach(coach, existingCoaches[index], refresh.fetchedAt, false)
    )
    const existingReferees = await db.referees.bulkGet(fixtureReferees.map(({ id }) => id))
    const referees = fixtureReferees.map((referee, index) =>
      toCachedReferee(referee, refresh.fetchedAt, existingReferees[index])
    )
    const existing = await db.fixtures.get(refresh.fixture.id)
    if (existing && existing.fetchedAt > refresh.fetchedAt) return
    const existingPlayers = await db.players.bulkGet(includedPlayers.map(({ id }) => id))
    const players = includedPlayers.map((player, index) =>
      toCachedIncludedPlayer(player, existingPlayers[index], refresh.fetchedAt)
    )
    const fixture = toCachedFixture(
      refresh.fixture,
      refresh.fetchedAt,
      existing?.staleAt ?? refresh.fetchedAt,
      existing,
      false
    )
    fixture.detailStaleAt =
      refresh.fetchedAt +
      (isFixtureOngoing(refresh.fixture.state_id)
        ? liveFixtureCacheDuration
        : fixtureDetailCacheDuration)
    await db.fixtures.put(fixture)
    await db.coaches.bulkPut(coaches)
    await db.referees.bulkPut(referees)
    await db.players.bulkPut(players)
  })
}

export async function readFixtureOdds(
  fixtureId: number,
  feed: OddsFeed
): Promise<{
  query: FixtureOddsQuery | null
  odds: CachedFixtureOdd[]
}> {
  const queryTable = feed === 'inplay' ? db.fixtureInplayOddsQueries : db.fixtureOddsQueries
  const oddsTable = feed === 'inplay' ? db.fixtureInplayOdds : db.fixtureOdds
  const query = await queryTable.get(fixtureId)
  if (!query) return { query: null, odds: [] }

  const odds = (await oddsTable.bulkGet(query.oddIds)).filter(
    (odd): odd is CachedFixtureOdd => odd !== undefined
  )

  return { query, odds }
}

export async function writeFixtureOddsRefresh(
  fixtureId: number,
  feed: OddsFeed,
  refresh: FixtureOddsRefresh
): Promise<void> {
  const queryTable = feed === 'inplay' ? db.fixtureInplayOddsQueries : db.fixtureOddsQueries
  const oddsTable = feed === 'inplay' ? db.fixtureInplayOdds : db.fixtureOdds
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
  const oddIds = new Set(query.oddIds)

  await db.transaction('rw', oddsTable, queryTable, async () => {
    const previousQuery = await queryTable.get(fixtureId)
    const removedOddIds = (previousQuery?.oddIds ?? []).filter((oddId) => !oddIds.has(oddId))
    await oddsTable.bulkDelete(removedOddIds)
    await oddsTable.bulkPut(odds)
    await queryTable.put(query)
  })
}

export function fixtureHeadToHeadQueryKey(input: RefreshFixtureHeadToHeadInput): string {
  const [firstTeamId, secondTeamId] = [input.firstTeamId, input.secondTeamId].toSorted(
    (left, right) => left - right
  )
  return `${firstTeamId}|${secondTeamId}|${input.timeZone}`
}

export async function readFixtureHeadToHead(input: RefreshFixtureHeadToHeadInput): Promise<{
  query: FixtureHeadToHeadQuery | null
  fixtures: CachedFixture[]
}> {
  const query = await db.fixtureHeadToHeadQueries.get(fixtureHeadToHeadQueryKey(input))
  if (!query) return { query: null, fixtures: [] }

  const fixtures = (await db.fixtures.bulkGet(query.fixtureIds)).filter(
    (fixture): fixture is CachedFixture => fixture !== undefined
  )

  return { query, fixtures }
}

export async function writeFixtureHeadToHeadRefresh(
  input: RefreshFixtureHeadToHeadInput,
  refresh: FixtureRefresh
): Promise<void> {
  const [firstTeamId, secondTeamId] = [input.firstTeamId, input.secondTeamId].toSorted(
    (left, right) => left - right
  )
  const staleAt = fixtureRefreshExpiry(
    refresh.fixtures,
    refresh.fetchedAt,
    refresh.fetchedAt + fixtureHeadToHeadCacheDuration
  )
  const query: FixtureHeadToHeadQuery = {
    key: fixtureHeadToHeadQueryKey(input),
    firstTeamId,
    secondTeamId,
    timeZone: input.timeZone,
    fixtureIds: refresh.fixtures.map(({ id }) => id),
    fetchedAt: refresh.fetchedAt,
    staleAt,
    pageCount: refresh.pageCount,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  }

  await db.transaction('rw', db.fixtures, db.fixtureHeadToHeadQueries, async () => {
    const fixtures = await toCachedFixtures(refresh.fixtures, refresh.fetchedAt, staleAt)
    await db.fixtures.bulkPut(fixtures)
    await db.fixtureHeadToHeadQueries.put(query)
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
    await db.competitions.bulkPut(competitions)
    await db.competitionCatalogs.put(catalog)
  })
}

export async function readCompetitionSeasons(
  competitionId: number
): Promise<CompetitionSeasonQuery | null> {
  return (await db.competitionSeasonQueries.get(competitionId)) ?? null
}

export async function writeCompetitionSeasonsRefresh(
  competitionId: number,
  refresh: CompetitionSeasonsRefresh
): Promise<void> {
  await db.competitionSeasonQueries.put({
    competitionId,
    seasons: refresh.seasons,
    fetchedAt: refresh.fetchedAt,
    staleAt: refresh.fetchedAt + competitionSeasonsCacheDuration,
    pageCount: refresh.pageCount,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  })
}

export async function readEntitySearch(query: string): Promise<EntitySearchResult[]> {
  const normalizedQuery = normalizeSearchText(query.trim())
  if (!normalizedQuery) return []

  const [competitions, teams, fixtures, players, coaches, referees, venues] = await Promise.all([
    db.competitions.toArray(),
    db.teams.toArray(),
    db.fixtures.toArray(),
    db.players.toArray(),
    db.coaches.toArray(),
    db.referees.toArray(),
    db.venues.toArray()
  ])
  const rankedResults = [
    ...competitions.map((competition) => ({
      result: {
        id: competition.id,
        type: 'competition' as const,
        name: competition.name,
        subtitle: competition.raw.country?.name ?? null,
        imagePath: competition.imagePath
      },
      score: searchScore(normalizedQuery, [competition.name, competition.raw.country?.name ?? ''])
    })),
    ...teams.map((team) => ({
      result: {
        id: team.id,
        type: 'team' as const,
        name: team.name,
        subtitle: team.raw.country?.name ?? null,
        imagePath: team.imagePath
      },
      score: searchScore(normalizedQuery, [team.name, team.raw.country?.name ?? ''])
    })),
    ...fixtures.map((fixture) => ({
      result: {
        id: fixture.id,
        type: 'fixture' as const,
        name: fixture.name ?? `Match ${fixture.id}`,
        subtitle:
          [fixture.raw.league?.name, formatSearchFixtureDate(fixture.startingAt)]
            .filter(Boolean)
            .join(' · ') || null,
        imagePath: null,
        fixture
      },
      score: searchScore(normalizedQuery, [
        fixture.name ?? '',
        fixture.raw.league?.name ?? '',
        ...fixture.raw.participants.map(({ name }) => name)
      ])
    })),
    ...players.map((player) => ({
      result: {
        id: player.id,
        type: 'player' as const,
        name: player.displayName,
        subtitle:
          [player.raw.position?.name, player.raw.nationality?.name].filter(Boolean).join(' · ') ||
          null,
        imagePath: player.imagePath
      },
      score: searchScore(normalizedQuery, [
        player.displayName,
        player.name,
        player.raw.common_name ?? '',
        player.raw.nationality?.name ?? ''
      ])
    })),
    ...coaches.map((coach) => ({
      result: {
        id: coach.id,
        type: 'coach' as const,
        name: coach.displayName,
        subtitle: coach.raw.nationality?.name ?? null,
        imagePath: coach.imagePath
      },
      score: searchScore(normalizedQuery, [
        coach.displayName,
        coach.name,
        coach.raw.common_name ?? '',
        coach.raw.nationality?.name ?? ''
      ])
    })),
    ...referees.map((referee) => ({
      result: {
        id: referee.id,
        type: 'referee' as const,
        name: referee.raw.display_name,
        subtitle: ['Referee', referee.raw.country?.name].filter(Boolean).join(' · '),
        imagePath: referee.raw.image_path ?? null
      },
      score: searchScore(normalizedQuery, [
        referee.raw.display_name,
        referee.raw.name,
        referee.raw.country?.name ?? ''
      ])
    })),
    ...venues.map((venue) => ({
      result: {
        id: venue.id,
        type: 'venue' as const,
        name: venue.name,
        subtitle:
          [venue.raw.city_name, venue.raw.country?.name].filter(Boolean).join(' · ') || null,
        imagePath: venue.imagePath
      },
      score: searchScore(normalizedQuery, [
        venue.name,
        venue.raw.city_name ?? '',
        venue.raw.country?.name ?? ''
      ])
    }))
  ]
    .filter(({ score }) => Number.isFinite(score))
    .toSorted((a, b) => {
      if (a.score !== b.score) return a.score - b.score
      const typeDifference = entityTypeOrder[a.result.type] - entityTypeOrder[b.result.type]
      if (a.result.type === 'fixture' && b.result.type === 'fixture') {
        return (b.result.fixture.startingAt ?? 0) - (a.result.fixture.startingAt ?? 0)
      }
      return typeDifference || a.result.name.localeCompare(b.result.name)
    })

  const resultCounts = new Map<EntitySearchResultType, number>()
  return rankedResults.flatMap(({ result }) => {
    const count = resultCounts.get(result.type) ?? 0
    if (count >= 5) return []
    resultCounts.set(result.type, count + 1)
    return [result]
  })
}

export async function writeEntitySearchRefresh(refresh: EntitySearchRefresh): Promise<void> {
  const staleAt = refresh.fetchedAt + teamCacheDuration
  const competitions: CachedCompetition[] = refresh.competitions.map((competition) => ({
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
  const players: CachedPlayer[] = refresh.players.map((player) => ({
    id: player.id,
    name: player.name,
    displayName: player.display_name,
    imagePath: player.image_path ?? null,
    positionId: player.position_id,
    nationalityId: player.nationality_id,
    raw: player,
    detailed: true,
    fetchedAt: refresh.fetchedAt,
    staleAt
  }))
  const venues: CachedVenue[] = refresh.venues.map((venue) => ({
    id: venue.id,
    countryId: venue.country_id ?? null,
    name: venue.name,
    imagePath: venue.image_path ?? null,
    raw: venue,
    fetchedAt: refresh.fetchedAt,
    staleAt
  }))

  await db.transaction(
    'rw',
    [db.fixtures, db.competitions, db.teams, db.players, db.coaches, db.referees, db.venues],
    async () => {
      const existingTeams = await db.teams.bulkGet(refresh.teams.map(({ id }) => id))
      const teams = refresh.teams.map((team, index) =>
        toCachedIncludedTeam(team, existingTeams[index], refresh.fetchedAt)
      )
      const existingCoaches = await db.coaches.bulkGet(refresh.coaches.map(({ id }) => id))
      const coaches = refresh.coaches.map((coach, index) =>
        toCachedCoach(coach, existingCoaches[index], refresh.fetchedAt, false)
      )
      const existingReferees = await db.referees.bulkGet(refresh.referees.map(({ id }) => id))
      const referees = refresh.referees.map((referee, index) =>
        toCachedReferee(referee, refresh.fetchedAt, existingReferees[index])
      )
      const fixtures = await toCachedFixtures(refresh.fixtures, refresh.fetchedAt, staleAt)
      await db.competitions.bulkPut(competitions)
      await db.teams.bulkPut(teams)
      await db.players.bulkPut(players)
      await db.coaches.bulkPut(coaches)
      await db.referees.bulkPut(referees)
      await db.fixtures.bulkPut(fixtures)
      await db.venues.bulkPut(venues)
    }
  )
}

function formatSearchFixtureDate(timestamp: number | null): string {
  if (timestamp === null) return ''
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(timestamp)
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

export async function readSeasonStatistics(
  seasonId: number
): Promise<SeasonStatisticsQuery | null> {
  return (await db.seasonStatisticsQueries.get(seasonId)) ?? null
}

export async function writeSeasonStatisticsRefresh(
  seasonId: number,
  refresh: SeasonStatisticsRefresh
): Promise<void> {
  await db.seasonStatisticsQueries.put({
    seasonId,
    statistics: refresh.statistics,
    fetchedAt: refresh.fetchedAt,
    staleAt: refresh.fetchedAt + statisticsCacheDuration,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  })
}

export function competitionFixtureQueryKey(input: RefreshCompetitionFixturesInput): string {
  return `${input.competitionId}|${input.startDate}|${input.endDate}|${input.timeZone}`
}

export async function readSeasonTopscorers(
  seasonId: number
): Promise<SeasonTopscorersQuery | null> {
  return (await db.seasonTopscorersQueries.get(seasonId)) ?? null
}

export async function writeSeasonTopscorersRefresh(
  seasonId: number,
  refresh: SeasonTopscorersRefresh
): Promise<void> {
  await db.transaction('rw', db.seasonTopscorersQueries, db.players, db.teams, async () => {
    const players = new Map<number, SportmonksPlayer>()
    const teams = new Map<number, SportmonksTeam>()
    for (const row of refresh.topscorers) {
      if (row.player) players.set(row.player.id, row.player)
      if (row.participant) teams.set(row.participant.id, row.participant)
    }
    const playerValues = [...players.values()]
    const teamValues = [...teams.values()]
    const existingPlayers = await db.players.bulkGet([...players.keys()])
    const existingTeams = await db.teams.bulkGet([...teams.keys()])
    await db.players.bulkPut(
      playerValues.map((player, index) =>
        toCachedIncludedPlayer(player, existingPlayers[index], refresh.fetchedAt)
      )
    )
    await db.teams.bulkPut(
      teamValues.map((team, index) =>
        toCachedIncludedTeam(team, existingTeams[index], refresh.fetchedAt)
      )
    )
    await db.seasonTopscorersQueries.put({
      ...refresh,
      seasonId,
      staleAt: refresh.fetchedAt + statisticsCacheDuration
    })
  })
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

  const teamCoaches = (refresh.team.coaches ?? []).flatMap(({ coach }) => (coach ? [coach] : []))

  const includedPlayers = (refresh.team.sidelined ?? []).flatMap(({ player }) =>
    player ? [player] : []
  )

  await db.transaction('rw', db.teams, db.coaches, db.players, async () => {
    const existingCoaches = await db.coaches.bulkGet(teamCoaches.map(({ id }) => id))
    const coaches = teamCoaches.map((coach, index) =>
      toCachedCoach(coach, existingCoaches[index], refresh.fetchedAt, false)
    )
    const existingPlayers = await db.players.bulkGet(includedPlayers.map(({ id }) => id))
    const players = includedPlayers.map((player, index) =>
      toCachedIncludedPlayer(player, existingPlayers[index], refresh.fetchedAt)
    )
    await db.teams.put(team)
    await db.coaches.bulkPut(coaches)
    await db.players.bulkPut(players)
  })
}

export async function readRefereeIdentity(refereeId: number): Promise<{
  referee: CachedReferee | null
  appointments: { fixture: CachedFixture; role: string }[]
}> {
  const referee = await db.referees.get(refereeId)
  if (!referee) return { referee: null, appointments: [] }
  const fixtures = await db.fixtures.bulkGet(referee.appointments.map(({ fixtureId }) => fixtureId))
  return {
    referee,
    appointments: referee.appointments
      .flatMap((appointment, index) => {
        const fixture = fixtures[index]
        return fixture ? [{ fixture, role: appointment.role }] : []
      })
      .toSorted((a, b) => (b.fixture.startingAt ?? 0) - (a.fixture.startingAt ?? 0))
  }
}

export async function writeRefereeRefresh(refresh: RefereeRefresh): Promise<void> {
  await db.transaction('rw', db.referees, db.fixtures, async () => {
    const existing = await db.referees.get(refresh.referee.id)
    if (existing && existing.fetchedAt > refresh.fetchedAt) return
    const referee = toCachedReferee(refresh.referee, refresh.fetchedAt, existing, true)
    const fixtures = await toCachedFixtures(
      (refresh.referee.latest ?? []).flatMap(({ fixture }) => (fixture ? [fixture] : [])),
      refresh.fetchedAt,
      refresh.fetchedAt
    )
    await db.referees.put(referee)
    await db.fixtures.bulkPut(fixtures)
  })
}

function toCachedReferee(
  referee: SportmonksReferee,
  fetchedAt: number,
  existing?: CachedReferee,
  detailed = false
): CachedReferee {
  const { latest, ...identity } = referee
  return {
    id: referee.id,
    raw: { ...existing?.raw, ...identity },
    detailed: detailed || existing?.detailed || false,
    appointments: detailed
      ? (latest ?? [])
          .filter(({ fixture }) => Boolean(fixture))
          .map((assignment) => ({
            fixtureId: assignment.fixture_id,
            role: assignment.type?.name ?? 'Match official'
          }))
      : (existing?.appointments ?? []),
    fetchedAt,
    staleAt: detailed ? fetchedAt + refereeCacheDuration : (existing?.staleAt ?? fetchedAt)
  }
}

export async function readCoachIdentity(coachId: number): Promise<{
  coach: CachedCoach | null
  teams: CoachTeamRecord[]
}> {
  const coach = await db.coaches.get(coachId)
  if (!coach) return { coach: null, teams: [] }

  const assignments = coach.raw.teams ?? []
  const teams = await db.teams.bulkGet(assignments.map(({ team_id }) => team_id))

  return {
    coach,
    teams: assignments.flatMap((assignment, index) => {
      const team = teams[index]
      return team ? [{ assignment, team }] : []
    })
  }
}

export async function writeCoachRefresh(refresh: CoachRefresh): Promise<void> {
  const assignments = refresh.coach.teams ?? []
  const includedTeams = assignments.flatMap(({ team }) => (team ? [team] : []))

  await db.transaction('rw', db.coaches, db.teams, async () => {
    const existingCoach = await db.coaches.get(refresh.coach.id)
    const existingTeams = await db.teams.bulkGet(includedTeams.map(({ id }) => id))
    const coach = toCachedCoach(refresh.coach, existingCoach, refresh.fetchedAt, true, refresh)
    const teams = includedTeams.map((team, index) =>
      toCachedIncludedTeam(team, existingTeams[index], refresh.fetchedAt)
    )
    await db.coaches.put(coach)
    await db.teams.bulkPut(teams)
  })
}

export function teamSquadQueryKey(teamId: number, seasonId?: number): string {
  return `${teamId}|${seasonId ?? 'current'}`
}

export async function readTeamSquad(
  teamId: number,
  seasonId?: number
): Promise<{
  query: TeamSquadQuery | null
  members: SquadMember[]
}> {
  const historical =
    seasonId === undefined
      ? undefined
      : await db.teamSeasonSquadQueries.get(teamSquadQueryKey(teamId, seasonId))
  const query = seasonId === undefined ? await db.teamSquadQueries.get(teamId) : historical
  if (!query) return { query: null, members: [] }

  const entries =
    historical?.entries ??
    (await db.squadEntries.bulkGet(query.entryIds)).filter(
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
  refresh: TeamSquadRefresh,
  seasonId?: number
): Promise<void> {
  const squad = refresh.squad.filter(
    (entry): entry is typeof entry & { player: SportmonksPlayer } => Boolean(entry.player)
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
    seasonId,
    entryIds: entries.map(({ id }) => id),
    fetchedAt: refresh.fetchedAt,
    staleAt: refresh.fetchedAt + teamSquadCacheDuration,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  }
  await db.transaction(
    'rw',
    db.players,
    db.squadEntries,
    db.teamSquadQueries,
    db.teamSeasonSquadQueries,
    async () => {
      const existingPlayers = await db.players.bulkGet(squad.map(({ player_id }) => player_id))
      const players = squad.map(({ player }, index) =>
        toCachedIncludedPlayer(player, existingPlayers[index], refresh.fetchedAt)
      )
      await db.players.bulkPut(players)
      if (seasonId !== undefined) {
        await db.teamSeasonSquadQueries.put({
          ...query,
          key: teamSquadQueryKey(teamId, seasonId),
          entries
        })
        return
      }

      const previousQuery = await db.teamSquadQueries.get(teamId)
      const entryIds = new Set(query.entryIds)
      const removedEntryIds = (previousQuery?.entryIds ?? []).filter((id) => !entryIds.has(id))
      await db.squadEntries.bulkDelete(removedEntryIds)
      await db.squadEntries.bulkPut(entries)
      await db.teamSquadQueries.put(query)
    }
  )
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

export function playerStatisticsQueryKey(input: RefreshPlayerStatisticsInput): string {
  return `${input.playerId}|${input.seasonId}`
}

export async function readPlayerStatistics(
  input: RefreshPlayerStatisticsInput
): Promise<PlayerStatisticsQuery | null> {
  return (await db.playerStatisticsQueries.get(playerStatisticsQueryKey(input))) ?? null
}

export async function writePlayerStatisticsRefresh(
  input: RefreshPlayerStatisticsInput,
  refresh: PlayerStatisticsRefresh
): Promise<void> {
  await db.playerStatisticsQueries.put({
    key: playerStatisticsQueryKey(input),
    playerId: input.playerId,
    seasonId: input.seasonId,
    statistics: refresh.statistics,
    fetchedAt: refresh.fetchedAt,
    staleAt: refresh.fetchedAt + statisticsCacheDuration,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  })
}

export async function readPlayerTransfers(input: RefreshPlayerTransfersInput): Promise<{
  query: PlayerTransferQuery | null
  transfers: CachedTransfer[]
}> {
  const query = await db.playerTransferQueries.get(input.playerId)
  if (!query) return { query: null, transfers: [] }

  const transfers = (await db.transfers.bulkGet(query.transferIds)).filter(
    (transfer): transfer is CachedTransfer => transfer !== undefined
  )

  return { query, transfers }
}

export async function writePlayerTransfersRefresh(
  input: RefreshPlayerTransfersInput,
  refresh: TransfersRefresh
): Promise<void> {
  const query: PlayerTransferQuery = {
    playerId: input.playerId,
    transferIds: refresh.transfers.map(({ id }) => id),
    fetchedAt: refresh.fetchedAt,
    staleAt: refresh.fetchedAt + transfersCacheDuration,
    pageCount: refresh.pageCount,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  }

  await db.transaction(
    'rw',
    db.transfers,
    db.playerTransferQueries,
    db.teams,
    db.players,
    async () => {
      const { players, teams, transfers } = await normalizeTransferRefresh(refresh)
      await db.transfers.bulkPut(transfers)
      await db.playerTransferQueries.put(query)
      await db.teams.bulkPut(teams)
      await db.players.bulkPut(players)
    }
  )
}

export async function readTeamTransfers(input: RefreshTeamTransfersInput): Promise<{
  query: TeamTransferQuery | null
  transfers: CachedTransfer[]
}> {
  const query = await db.teamTransferQueries.get(input.teamId)
  if (!query) return { query: null, transfers: [] }

  const transfers = (await db.transfers.bulkGet(query.transferIds)).filter(
    (transfer): transfer is CachedTransfer => transfer !== undefined
  )

  return { query, transfers }
}

export async function writeTeamTransfersRefresh(
  input: RefreshTeamTransfersInput,
  refresh: TransfersRefresh
): Promise<void> {
  const query: TeamTransferQuery = {
    teamId: input.teamId,
    transferIds: refresh.transfers.map(({ id }) => id),
    fetchedAt: refresh.fetchedAt,
    staleAt: refresh.fetchedAt + transfersCacheDuration,
    pageCount: refresh.pageCount,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
  }

  await db.transaction(
    'rw',
    db.transfers,
    db.teamTransferQueries,
    db.teams,
    db.players,
    async () => {
      const { players, teams, transfers } = await normalizeTransferRefresh(refresh)
      await db.transfers.bulkPut(transfers)
      await db.teamTransferQueries.put(query)
      await db.teams.bulkPut(teams)
      await db.players.bulkPut(players)
    }
  )
}

async function normalizeTransferRefresh(refresh: TransfersRefresh): Promise<{
  players: CachedPlayer[]
  teams: CachedTeam[]
  transfers: CachedTransfer[]
}> {
  const transfers: CachedTransfer[] = refresh.transfers.map((transfer) => ({
    id: transfer.id,
    playerId: transfer.player_id,
    fromTeamId: transfer.from_team_id,
    toTeamId: transfer.to_team_id,
    date: transfer.date,
    raw: transfer,
    fetchedAt: refresh.fetchedAt
  }))
  const includedTeams = new Map<number, SportmonksTeam>()
  const includedPlayers = new Map<number, SportmonksPlayer>()

  for (const transfer of refresh.transfers) {
    if (transfer.fromTeam) includedTeams.set(transfer.fromTeam.id, transfer.fromTeam)
    if (transfer.toTeam) includedTeams.set(transfer.toTeam.id, transfer.toTeam)
    if (transfer.player) includedPlayers.set(transfer.player.id, transfer.player)
  }

  const teamValues = [...includedTeams.values()]
  const playerValues = [...includedPlayers.values()]
  const [existingTeams, existingPlayers] = await Promise.all([
    db.teams.bulkGet(teamValues.map(({ id }) => id)),
    db.players.bulkGet(playerValues.map(({ id }) => id))
  ])
  const teams = teamValues.map((team, index) =>
    toCachedIncludedTeam(team, existingTeams[index], refresh.fetchedAt)
  )
  const players = playerValues.map((player, index) =>
    toCachedIncludedPlayer(player, existingPlayers[index], refresh.fetchedAt)
  )

  return { players, teams, transfers }
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

export function teamStatisticsQueryKey(input: RefreshTeamStatisticsInput): string {
  return `${input.teamId}|${input.seasonId}`
}

export async function readTeamStatistics(
  input: RefreshTeamStatisticsInput
): Promise<TeamStatisticsQuery | null> {
  return (await db.teamStatisticsQueries.get(teamStatisticsQueryKey(input))) ?? null
}

export async function writeTeamStatisticsRefresh(
  input: RefreshTeamStatisticsInput,
  refresh: TeamStatisticsRefresh
): Promise<void> {
  await db.teamStatisticsQueries.put({
    key: teamStatisticsQueryKey(input),
    teamId: input.teamId,
    seasonId: input.seasonId,
    statistics: refresh.statistics,
    fetchedAt: refresh.fetchedAt,
    staleAt: refresh.fetchedAt + statisticsCacheDuration,
    rateLimitRemaining: refresh.rateLimit?.remaining,
    rateLimitResetsAt: refresh.rateLimit?.resetsAt,
    message: refresh.message
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
      db.subscriptionQueries,
      db.fixtureTvQueries,
      db.fixturePressureQueries,
      db.teamOfWeekQueries,
      db.fixtures,
      db.fixtureQueries,
      db.fixtureOdds,
      db.fixtureOddsQueries,
      db.fixtureInplayOdds,
      db.fixtureInplayOddsQueries,
      db.fixtureCommentaryQueries,
      db.fixtureHeadToHeadQueries,
      db.competitions,
      db.competitionCatalogs,
      db.competitionSeasonQueries,
      db.standings,
      db.standingQueries,
      db.seasonStatisticsQueries,
      db.seasonTopscorersQueries,
      db.seasonScheduleQueries,
      db.competitionFixtureQueries,
      db.teams,
      db.teamFixtureQueries,
      db.teamRivalsQueries,
      db.teamStatisticsQueries,
      db.venues,
      db.players,
      db.coaches,
      db.referees,
      db.squadEntries,
      db.teamSquadQueries,
      db.teamSeasonSquadQueries,
      db.playerAppearances,
      db.playerAppearanceQueries,
      db.playerStatisticsQueries,
      db.transfers,
      db.playerTransferQueries,
      db.teamTransferQueries
    ],
    async () => {
      await db.subscriptionQueries.clear()
      await db.fixtureTvQueries.clear()
      await db.fixturePressureQueries.clear()
      await db.teamOfWeekQueries.clear()
      await db.fixtures.clear()
      await db.fixtureQueries.clear()
      await db.fixtureOdds.clear()
      await db.fixtureOddsQueries.clear()
      await db.fixtureInplayOdds.clear()
      await db.fixtureInplayOddsQueries.clear()
      await db.fixtureCommentaryQueries.clear()
      await db.fixtureHeadToHeadQueries.clear()
      await db.competitions.clear()
      await db.competitionCatalogs.clear()
      await db.competitionSeasonQueries.clear()
      await db.standings.clear()
      await db.standingQueries.clear()
      await db.seasonStatisticsQueries.clear()
      await db.seasonTopscorersQueries.clear()
      await db.seasonScheduleQueries.clear()
      await db.competitionFixtureQueries.clear()
      await db.teams.clear()
      await db.teamFixtureQueries.clear()
      await db.teamRivalsQueries.clear()
      await db.teamStatisticsQueries.clear()
      await db.venues.clear()
      await db.players.clear()
      await db.coaches.clear()
      await db.referees.clear()
      await db.squadEntries.clear()
      await db.teamSquadQueries.clear()
      await db.teamSeasonSquadQueries.clear()
      await db.playerAppearances.clear()
      await db.playerAppearanceQueries.clear()
      await db.playerStatisticsQueries.clear()
      await db.transfers.clear()
      await db.playerTransferQueries.clear()
      await db.teamTransferQueries.clear()
    }
  )
}

function searchScore(query: string, values: string[]): number {
  return values.reduce((bestScore, value, valueIndex) => {
    const normalizedValue = normalizeSearchText(value)
    if (!normalizedValue) return bestScore

    let score = Number.POSITIVE_INFINITY
    if (normalizedValue === query) score = 0
    else if (normalizedValue.startsWith(query)) score = 1
    else if (normalizedValue.split(/\s+/).some((word) => word.startsWith(query))) score = 2
    else if (normalizedValue.includes(query)) score = 3

    return Math.min(bestScore, score + valueIndex * 4)
  }, Number.POSITIVE_INFINITY)
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
}

function toCachedIncludedPlayer(
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

function toCachedCoach(
  coach: SportmonksCoach,
  existing: CachedCoach | undefined,
  fetchedAt: number,
  detailed: boolean,
  refresh?: CoachRefresh
): CachedCoach {
  const preserveDetailedRecord = existing?.detailed && !detailed
  const raw = preserveDetailedRecord
    ? {
        ...coach,
        ...existing.raw,
        country: existing.raw.country ?? coach.country,
        nationality: existing.raw.nationality ?? coach.nationality,
        teams: existing.raw.teams
      }
    : {
        ...existing?.raw,
        ...coach,
        country: coach.country ?? existing?.raw.country,
        nationality: coach.nationality ?? existing?.raw.nationality,
        teams: coach.teams ?? existing?.raw.teams
      }

  return {
    id: coach.id,
    name: coach.name,
    displayName: coach.display_name,
    imagePath: coach.image_path ?? null,
    nationalityId: coach.nationality_id,
    raw,
    detailed: detailed || existing?.detailed || false,
    fetchedAt,
    staleAt: detailed
      ? fetchedAt + coachCacheDuration
      : existing?.detailed
        ? existing.staleAt
        : fetchedAt,
    rateLimitRemaining: refresh?.rateLimit?.remaining ?? existing?.rateLimitRemaining,
    rateLimitResetsAt: refresh?.rateLimit?.resetsAt ?? existing?.rateLimitResetsAt,
    message: refresh?.message ?? existing?.message
  }
}

function toCachedIncludedTeam(
  team: SportmonksTeam,
  existing: CachedTeam | undefined,
  fetchedAt: number
): CachedTeam {
  const raw = existing
    ? {
        ...existing.raw,
        ...team,
        country: team.country ?? existing.raw.country,
        venue: team.venue ?? existing.raw.venue
      }
    : team

  return {
    id: team.id,
    countryId: team.country_id,
    venueId: team.venue_id ?? null,
    name: team.name,
    imagePath: team.image_path ?? null,
    raw,
    fetchedAt,
    staleAt: existing?.staleAt ?? fetchedAt,
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
  if (existing && existing.fetchedAt > fetchedAt) return existing
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
    periods: fixture.periods ?? existing.periods,
    lineups: fixture.lineups ?? existing.lineups,
    events: fixture.events ?? existing.events,
    statistics: fixture.statistics ?? existing.statistics,
    coaches: fixture.coaches ?? existing.coaches,
    referees: fixture.referees ?? existing.referees,
    weatherreport:
      fixture.weatherreport === undefined ? existing.weatherreport : fixture.weatherreport,
    sidelined: fixture.sidelined ?? existing.sidelined
  }
}

function fixtureRefreshExpiry(
  fixtures: SportmonksFixture[],
  fetchedAt: number,
  defaultStaleAt: number
): number {
  return fixtures.some(({ state_id }) => isFixtureOngoing(state_id))
    ? fetchedAt + liveFixtureCacheDuration
    : defaultStaleAt
}
