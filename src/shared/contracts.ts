export const ipcChannels = {
  refreshSubscription: 'sportmonks:refresh-subscription',
  refreshFixtureTv: 'sportmonks:refresh-fixture-tv',
  refreshFixturePressure: 'sportmonks:refresh-fixture-pressure',
  refreshTeamOfWeek: 'sportmonks:refresh-team-of-week',
  connectionState: 'credentials:connection-state',
  saveToken: 'credentials:save-token',
  clearToken: 'credentials:clear-token',
  refreshFixtures: 'sportmonks:refresh-fixtures',
  refreshFixtureWindow: 'sportmonks:refresh-fixture-window',
  refreshFixture: 'sportmonks:refresh-fixture',
  refreshFixtureHeadToHead: 'sportmonks:refresh-fixture-head-to-head',
  refreshFixtureOdds: 'sportmonks:refresh-fixture-odds',
  refreshFixtureCommentary: 'sportmonks:refresh-fixture-commentary',
  refreshCompetitions: 'sportmonks:refresh-competitions',
  refreshCompetitionSeasons: 'sportmonks:refresh-competition-seasons',
  refreshStandings: 'sportmonks:refresh-standings',
  refreshRoundStandings: 'sportmonks:refresh-round-standings',
  refreshTransferFeed: 'sportmonks:refresh-transfer-feed',
  refreshSeasonStatistics: 'sportmonks:refresh-season-statistics',
  refreshSeasonTopscorers: 'sportmonks:refresh-season-topscorers',
  refreshSeasonSchedule: 'sportmonks:refresh-season-schedule',
  refreshCompetitionFixtures: 'sportmonks:refresh-competition-fixtures',
  refreshTeam: 'sportmonks:refresh-team',
  refreshTeamRivals: 'sportmonks:refresh-team-rivals',
  refreshTeamFixtures: 'sportmonks:refresh-team-fixtures',
  refreshTeamSquad: 'sportmonks:refresh-team-squad',
  refreshTeamStatistics: 'sportmonks:refresh-team-statistics',
  refreshTeamTransfers: 'sportmonks:refresh-team-transfers',
  refreshVenue: 'sportmonks:refresh-venue',
  refreshPlayer: 'sportmonks:refresh-player',
  refreshCoach: 'sportmonks:refresh-coach',
  refreshReferee: 'sportmonks:refresh-referee',
  refreshPlayerAppearances: 'sportmonks:refresh-player-appearances',
  refreshPlayerStatistics: 'sportmonks:refresh-player-statistics',
  refreshPlayerTransfers: 'sportmonks:refresh-player-transfers',
  searchEntities: 'sportmonks:search-entities',
  rateLimitState: 'sportmonks:rate-limit-state',
  rateLimitChanged: 'sportmonks:rate-limit-changed'
} as const

export type ApiErrorCode =
  | 'missing_token'
  | 'invalid_input'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'network'
  | 'invalid_response'
  | 'storage'
  | 'upstream'

export interface SportmonksRateLimit {
  estimated?: boolean
  remaining: number
  requestedEntity?: string
  resetsAt: number
}

export interface ApiError {
  code: ApiErrorCode
  message: string
  rateLimit?: SportmonksRateLimit
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: ApiError }

export interface ConnectionState {
  configured: boolean
}

export interface SubscriptionRefresh {
  plans: { name: string; category: string }[]
  addOns: string[]
  resources: { id: number; description: string }[]
  enrichments: { id: number; name: string }[]
  fetchedAt: number
}

export interface SportmonksTvListing {
  id: number
  fixture_id: number
  tvstation_id: number
  country_id: number | null
  tvstation: { id: number; name: string; url: string | null; image_path: string | null } | null
  country: { id: number; name: string; image_path: string | null } | null
}

export interface FixtureTvRefresh {
  listings: SportmonksTvListing[]
  fetchedAt: number
}

export interface SportmonksPressure {
  id: number
  fixture_id: number
  participant_id: number
  minute: number
  pressure: number
}

export interface FixturePressureRefresh {
  points: SportmonksPressure[]
  fetchedAt: number
}

export interface RefreshTeamOfWeekInput {
  competitionId: number
  roundId?: number
}

export interface SportmonksTeamOfWeekEntry {
  id: number
  player_id: number
  team_id: number
  fixture_id: number
  round_id: number
  rating: number | null
  formation_position: number | null
  formation: string | null
  player: SportmonksPlayer | null
  team: SportmonksTeam | null
  round: {
    id: number
    league_id: number
    season_id: number
    name: string
    starting_at?: string | null
    ending_at?: string | null
  }
}

export interface TeamOfWeekRefresh {
  entries: SportmonksTeamOfWeekEntry[]
  fetchedAt: number
}

export interface SaveTokenInput {
  token: string
}

export interface RefreshFixturesInput {
  date: string
  timeZone: string
}

export interface RefreshFixtureWindowInput {
  startDate: string
  endDate: string
  timeZone: string
}

export interface RefreshFixtureInput {
  fixtureId: number
}

export type OddsFeed = 'pre-match' | 'inplay'

export interface RefreshFixtureOddsInput extends RefreshFixtureInput {
  feed: OddsFeed
}

export interface SportmonksCommentary {
  id: number
  fixture_id: number
  comment: string
  minute: number | null
  extra_minute: number | null
  is_goal: boolean
  is_important: boolean
  order: number
  player?: SportmonksPlayer | null
  relatedPlayer?: SportmonksPlayer | null
}

export interface FixtureCommentaryRefresh {
  commentaries: SportmonksCommentary[]
  fetchedAt: number
  rateLimit?: SportmonksRateLimit
  message?: string
}

export interface RefreshFixtureHeadToHeadInput {
  firstTeamId: number
  secondTeamId: number
  timeZone: string
}

export interface RefreshStandingsInput {
  seasonId: number
}

export interface RefreshRoundStandingsInput extends RefreshStandingsInput {
  roundId: number
}

export interface RefreshSeasonScheduleInput {
  seasonId: number
}

export interface SportmonksScheduleRound {
  id: number
  name: string
  finished: boolean
  is_current: boolean
  starting_at?: string | null
  ending_at?: string | null
  fixtures: SportmonksFixture[]
}

export interface SportmonksScheduleStage extends SportmonksScheduleRound {
  season_id: number
  sort_order: number
  rounds: SportmonksScheduleRound[]
}

export interface SeasonScheduleRefresh {
  stages: SportmonksScheduleStage[]
  fetchedAt: number
  rateLimit?: SportmonksRateLimit
  message?: string
}

export interface RefreshSeasonStatisticsInput {
  seasonId: number
}

export interface RefreshSeasonTopscorersInput {
  seasonId: number
}

export interface RefreshCompetitionSeasonsInput {
  competitionId: number
}

export interface RefreshCompetitionFixturesInput {
  competitionId: number
  startDate: string
  endDate: string
  timeZone: string
}

export interface RefreshTeamInput {
  teamId: number
}

export interface SportmonksRival {
  team_id: number
  rival_id: number
  team?: SportmonksTeam | null
  rival?: SportmonksTeam | null
}

export interface TeamRivalsRefresh {
  rivals: SportmonksRival[]
  fetchedAt: number
  rateLimit?: SportmonksRateLimit
  message?: string
}

export interface RefreshTeamStatisticsInput {
  seasonId: number
  teamId: number
}

export interface RefreshTeamFixturesInput {
  teamId: number
  startDate: string
  endDate: string
  timeZone: string
}

export interface RefreshVenueInput {
  venueId: number
}

export interface RefreshTeamSquadInput {
  teamId: number
  seasonId?: number
}

export interface RefreshPlayerInput {
  playerId: number
}

export interface RefreshCoachInput {
  coachId: number
}

export interface RefreshRefereeInput {
  refereeId: number
}

export interface SportmonksReferee {
  id: number
  name: string
  display_name: string
  country_id: number | null
  image_path?: string | null
  date_of_birth?: string | null
  country?: SportmonksCountry | null
  latest?: SportmonksRefereeAssignment[]
  statistics?: SportmonksRefereeStatistic[]
}

export interface SportmonksRefereeStatistic {
  id: number
  referee_id: number
  season_id: number
  details: { type_id: number; value: unknown }[]
  season?: {
    id: number
    league_id: number
    name: string
    starting_at?: string | null
    is_current?: boolean
    league?: { id: number; name: string } | null
  } | null
}

export interface SportmonksRefereeAssignment {
  id: number
  fixture_id: number
  referee_id: number
  type_id: number
  type?: SportmonksPosition | null
  referee?: SportmonksReferee | null
  fixture?: SportmonksFixture | null
}

export interface RefreshPlayerAppearancesInput {
  playerId: number
  teamId: number
  startDate: string
  endDate: string
  timeZone: string
}

export interface RefreshPlayerStatisticsInput {
  playerId: number
  seasonId: number
}

export interface RefreshPlayerTransfersInput {
  playerId: number
}

export interface RefreshTeamTransfersInput {
  teamId: number
}

export type RefreshTransferFeedInput =
  | { feed: 'latest'; page: number }
  | { feed: 'dates'; page: number; startDate: string; endDate: string }

export interface TransferFeedRefresh extends Omit<TransfersRefresh, 'pageCount'> {
  page: number
  hasMore: boolean
}

export interface EntitySearchInput {
  query: string
  entity?: 'teams' | 'players'
}

export interface SportmonksCountry {
  id: number
  name: string
  iso2?: string | null
  image_path?: string | null
}

export interface SportmonksSeason {
  id: number
  league_id: number
  name: string
  is_current: boolean
  starting_at?: string | null
  ending_at?: string | null
}

export interface SportmonksCompetition {
  id: number
  country_id: number
  name: string
  active: boolean
  short_code?: string | null
  image_path?: string | null
  type?: string | null
  sub_type?: string | null
  country?: SportmonksCountry | null
  currentseason?: SportmonksSeason | null
}

export interface SportmonksParticipant {
  id: number
  name: string
  short_code?: string | null
  image_path?: string | null
  meta?: {
    location?: 'home' | 'away'
    winner?: boolean | null
    position?: number | null
  }
}

export interface SportmonksVenue {
  id: number
  name: string
  country_id?: number
  city_id?: number | null
  address?: string | null
  zipcode?: string | null
  latitude?: string | null
  longitude?: string | null
  capacity?: number | null
  city_name?: string | null
  image_path?: string | null
  surface?: string | null
  national_team?: boolean
  country?: SportmonksCountry | null
}

export interface SportmonksTeam {
  id: number
  sport_id: number
  country_id: number | null
  venue_id: number | null
  gender: string | null
  name: string
  short_code?: string | null
  image_path?: string | null
  founded: number | null
  type?: string | null
  placeholder: boolean
  last_played_at?: string | null
  country?: SportmonksCountry | null
  venue?: SportmonksVenue | null
  coaches?: SportmonksCoachTeam[]
  sidelined?: SportmonksSidelined[]
  rankings?: SportmonksTeamRanking[]
}

export interface SportmonksTeamRanking {
  id: number
  participant_id: number
  position: number | null
  points: number | null
  type: string
}

export interface SportmonksSidelined {
  id: number
  player_id: number
  team_id: number
  season_id: number | null
  type_id: number
  category: string
  start_date: string
  end_date: string | null
  games_missed: number
  completed: boolean
  type?: SportmonksPosition | null
  player?: SportmonksPlayer | null
}

export interface SportmonksPosition {
  id: number
  name: string
  code?: string | null
  developer_name?: string | null
}

export interface SportmonksTransfer {
  id: number
  sport_id: number
  player_id: number
  type_id: number
  from_team_id: number | null
  to_team_id: number | null
  position_id: number | null
  detailed_position_id: number | null
  date: string
  career_ended: boolean
  completed: boolean
  amount: number | string | null
  completed_at?: string | null
  type?: SportmonksType | null
  player?: SportmonksPlayer | null
  fromTeam?: SportmonksTeam | null
  toTeam?: SportmonksTeam | null
}

export interface SportmonksPlayer {
  id: number
  sport_id: number
  country_id: number | null
  nationality_id: number | null
  city_id: number | null
  position_id: number | null
  detailed_position_id: number | null
  type_id: number | null
  common_name?: string | null
  firstname?: string | null
  lastname?: string | null
  name: string
  display_name: string
  image_path?: string | null
  height: number | null
  weight: number | null
  date_of_birth: string | null
  gender: string | null
  country?: SportmonksCountry | null
  nationality?: SportmonksCountry | null
  position?: SportmonksPosition | null
  detailedPosition?: SportmonksPosition | null
}

export interface SportmonksCoachTeam {
  id: number
  team_id: number
  coach_id: number
  position_id: number | null
  active: boolean
  start: string | null
  end: string | null
  temporary: boolean
  team?: SportmonksTeam | null
  coach?: SportmonksCoach | null
}

export interface SportmonksCoach {
  id: number
  player_id: number | null
  sport_id: number
  country_id: number | null
  nationality_id: number | null
  city_id: number | null
  common_name?: string | null
  firstname?: string | null
  lastname?: string | null
  name: string
  display_name: string
  image_path?: string | null
  height: number | null
  weight: number | null
  date_of_birth: string | null
  gender: string | null
  country?: SportmonksCountry | null
  nationality?: SportmonksCountry | null
  teams?: SportmonksCoachTeam[]
  meta?: {
    fixture_id?: number
    participant_id?: number
  }
}

export interface SportmonksSquadEntry {
  id: number
  transfer_id: number | null
  player_id: number
  team_id: number
  position_id: number | null
  detailed_position_id: number | null
  jersey_number: number | null
  start: string | null
  end: string | null
  player?: SportmonksPlayer | null
  position?: SportmonksPosition | null
  detailedPosition?: SportmonksPosition | null
}

export interface SportmonksLeague {
  id: number
  name: string
  short_code?: string | null
}

export interface SportmonksState {
  id: number
  name: string
  short_name?: string
  developer_name?: string
}

export interface SportmonksPeriod {
  id: number
  fixture_id: number
  type_id: number
  started: number
  ended: number | null
  counts_from: number
  ticking: boolean
  sort_order: number
  description: string
  time_added: number | null
  period_length: number
  minutes: number
  seconds: number
  has_timer: boolean
}

export interface SportmonksScore {
  id: number
  participant_id: number
  description?: string
  score: {
    goals: number
    participant: 'home' | 'away'
  }
}

export interface SportmonksType {
  id: number
  name: string
  code?: string | null
  developer_name?: string | null
  stat_group?: string | null
}

export interface SportmonksEventPlayer {
  id: number
  name: string
  display_name?: string | null
  image_path?: string | null
}

export interface SportmonksEvent {
  id: number
  fixture_id: number
  period_id: number
  participant_id: number
  type_id: number
  player_id?: number | null
  related_player_id?: number | null
  player_name?: string | null
  related_player_name?: string | null
  result?: string | null
  info?: string | null
  addition?: string | null
  minute: number
  extra_minute?: number | null
  sort_order?: number | null
  injured?: boolean | null
  rescinded?: boolean | null
  type?: SportmonksType | null
  player?: SportmonksEventPlayer | null
  relatedPlayer?: SportmonksEventPlayer | null
}

export interface SportmonksFixtureStatistic {
  id: number
  fixture_id: number
  type_id: number
  participant_id: number
  data: {
    value?: number | string | null
  }
  location: 'home' | 'away'
  type?: SportmonksType | null
}

export interface SportmonksBookmaker {
  id: number
  name: string
}

export interface SportmonksMarket {
  id: number
  name: string
  developer_name?: string | null
}

export interface SportmonksOdd {
  id: number
  fixture_id: number
  market_id: number
  bookmaker_id: number
  label: string
  value: string
  name?: string | null
  market_description?: string | null
  probability?: string | null
  winning?: boolean | null
  stopped?: boolean | null
  suspended?: boolean | null
  participants?: string | null
  latest_bookmaker_update?: string | null
  total?: string | null
  handicap?: string | null
  bookmaker?: SportmonksBookmaker | null
  market?: SportmonksMarket | null
}

export interface SportmonksFixture {
  id: number
  league_id: number
  season_id: number
  state_id: number
  stage_id?: number | null
  round_id?: number | null
  venue_id?: number | null
  name?: string | null
  starting_at?: string | null
  starting_at_timestamp?: number | null
  result_info?: string | null
  placeholder: boolean
  has_odds: boolean
  participants: SportmonksParticipant[]
  league?: SportmonksLeague | null
  state?: SportmonksState | null
  stage?: SportmonksFixtureContext | null
  round?: SportmonksFixtureContext | null
  venue?: SportmonksVenue | null
  scores: SportmonksScore[]
  periods?: SportmonksPeriod[]
  lineups?: SportmonksLineup[]
  events?: SportmonksEvent[]
  statistics?: SportmonksFixtureStatistic[]
  coaches?: SportmonksCoach[]
  referees?: SportmonksRefereeAssignment[]
  weatherreport?: SportmonksWeatherReport | null
  sidelined?: SportmonksFixtureAbsence[]
}

export interface SportmonksFixtureAbsence {
  id: number
  fixture_id: number
  participant_id: number
  player_id?: number | null
  type_id?: number | null
  player?: SportmonksPlayer | null
  type?: SportmonksType | null
}

export interface SportmonksWeatherTemperatures {
  current?: number | null
  morning?: number | null
  day?: number | null
  evening?: number | null
  night?: number | null
}

export interface SportmonksWeatherReport {
  id: number
  fixture_id: number
  type?: string | null
  metric?: string | null
  description?: string | null
  temperature?: SportmonksWeatherTemperatures | null
  feels_like?: SportmonksWeatherTemperatures | null
  humidity?: string | null
  clouds?: string | null
  current?: {
    temp?: number | null
    feels_like?: number | null
    humidity?: string | null
    clouds?: string | null
    description?: string | null
  } | null
}

export interface SportmonksFixtureContext {
  id: number
  name: string
}

export interface SportmonksLineup {
  id: number
  fixture_id: number
  player_id: number
  team_id: number
  position_id: number | null
  detailed_position_id?: number | null
  type_id: number
  formation_field?: string | null
  formation_position?: number | null
  player_name: string
  jersey_number: number | null
  player?: SportmonksPlayer | null
  details?: SportmonksLineupDetail[]
}

export interface SportmonksLineupDetail {
  id: number
  fixture_id: number
  player_id: number
  team_id: number
  lineup_id: number
  type_id: number
  data: {
    value?: number | string | null
  }
}

export interface SportmonksStandingContext {
  id: number
  name: string
}

export interface SportmonksStandingDetail {
  id: number
  type_id: number
  value: number
}

export interface SportmonksStandingForm {
  id: number
  fixture_id: number
  form: string
  sort_order: number
}

export interface SportmonksStanding {
  id: number
  participant_id: number
  league_id: number
  season_id: number
  stage_id: number
  group_id: number | null
  round_id: number | null
  standing_rule_id: number | null
  position: number
  result: string | null
  points: number
  participant?: SportmonksParticipant | null
  stage?: SportmonksStandingContext | null
  group?: SportmonksStandingContext | null
  details?: SportmonksStandingDetail[]
  form?: SportmonksStandingForm[]
  rule?: { id: number; type_id: number; type?: SportmonksType | null } | null
}

export interface SportmonksSeasonStatistic {
  id: number
  model_id: number
  type_id: number
  relation_id?: number | null
  value: unknown
}

export interface SportmonksTeamStatistic {
  id: number
  team_statistic_id: number
  type_id: number
  value: unknown
}

export interface SportmonksPlayerStatisticDetail {
  id: number
  player_statistic_id: number
  type_id: number
  value: unknown
}

export interface SportmonksPlayerStatistic {
  id: number
  player_id: number
  team_id: number
  season_id: number
  has_values: boolean
  position_id: number | null
  jersey_number: number | null
  details: SportmonksPlayerStatisticDetail[]
}

export interface FixtureRefresh {
  fixtures: SportmonksFixture[]
  fetchedAt: number
  pageCount: number
  timeZone: string
  rateLimit?: {
    remaining: number
    resetsAt: number
  }
  message?: string
}

export interface FixtureDetailRefresh {
  fixture: SportmonksFixture
  fetchedAt: number
  rateLimit?: {
    remaining: number
    resetsAt: number
  }
  message?: string
}

export interface FixtureOddsRefresh {
  odds: SportmonksOdd[]
  fetchedAt: number
  rateLimit?: {
    remaining: number
    resetsAt: number
  }
  message?: string
}

export interface CompetitionRefresh {
  competitions: SportmonksCompetition[]
  fetchedAt: number
  pageCount: number
  rateLimit?: {
    remaining: number
    resetsAt: number
  }
  message?: string
}

export interface CompetitionSeasonsRefresh {
  seasons: SportmonksSeason[]
  fetchedAt: number
  pageCount: number
  rateLimit?: {
    remaining: number
    resetsAt: number
  }
  message?: string
}

export interface StandingsRefresh {
  standings: SportmonksStanding[]
  fetchedAt: number
  rateLimit?: {
    remaining: number
    resetsAt: number
  }
  message?: string
}

export interface SeasonStatisticsRefresh {
  statistics: SportmonksSeasonStatistic[]
  fetchedAt: number
  rateLimit?: {
    remaining: number
    resetsAt: number
  }
  message?: string
}

export interface SportmonksTopscorer {
  id: number
  season_id: number
  player_id: number
  participant_id: number | null
  type_id: number
  position: number
  total: number
  player?: SportmonksPlayer | null
  participant?: SportmonksTeam | null
  type?: SportmonksType | null
}

export interface SeasonTopscorersRefresh {
  topscorers: SportmonksTopscorer[]
  fetchedAt: number
  pageCount: number
  rateLimit?: {
    remaining: number
    resetsAt: number
  }
  message?: string
}

export interface TeamRefresh {
  team: SportmonksTeam
  fetchedAt: number
  rateLimit?: {
    remaining: number
    resetsAt: number
  }
  message?: string
}

export interface TeamStatisticsRefresh {
  statistics: SportmonksTeamStatistic[]
  fetchedAt: number
  rateLimit?: {
    remaining: number
    resetsAt: number
  }
  message?: string
}

export interface VenueRefresh {
  venue: SportmonksVenue
  fetchedAt: number
  rateLimit?: {
    remaining: number
    resetsAt: number
  }
  message?: string
}

export interface TeamSquadRefresh {
  squad: SportmonksSquadEntry[]
  fetchedAt: number
  rateLimit?: {
    remaining: number
    resetsAt: number
  }
  message?: string
}

export interface PlayerRefresh {
  player: SportmonksPlayer
  fetchedAt: number
  rateLimit?: {
    remaining: number
    resetsAt: number
  }
  message?: string
}

export interface CoachRefresh {
  coach: SportmonksCoach
  fetchedAt: number
  rateLimit?: {
    remaining: number
    resetsAt: number
  }
  message?: string
}

export interface RefereeRefresh {
  referee: SportmonksReferee
  fetchedAt: number
  rateLimit?: SportmonksRateLimit
  message?: string
}

export interface EntitySearchRefresh {
  competitions: SportmonksCompetition[]
  teams: SportmonksTeam[]
  players: SportmonksPlayer[]
  coaches: SportmonksCoach[]
  referees: SportmonksReferee[]
  fixtures: SportmonksFixture[]
  venues: SportmonksVenue[]
  fetchedAt: number
}

export interface SportmonksPlayerAppearance {
  fixture: SportmonksFixture
  lineup: SportmonksLineup
}

export interface PlayerAppearancesRefresh {
  appearances: SportmonksPlayerAppearance[]
  fetchedAt: number
  pageCount: number
  timeZone: string
  rateLimit?: {
    remaining: number
    resetsAt: number
  }
  message?: string
}

export interface PlayerStatisticsRefresh {
  statistics: SportmonksPlayerStatistic[]
  fetchedAt: number
  rateLimit?: {
    remaining: number
    resetsAt: number
  }
  message?: string
}

export interface TransfersRefresh {
  transfers: SportmonksTransfer[]
  fetchedAt: number
  pageCount: number
  rateLimit?: {
    remaining: number
    resetsAt: number
  }
  message?: string
}

export interface HalfspaceApi {
  credentials: {
    getConnectionState(): Promise<ConnectionState>
    saveToken(input: SaveTokenInput): Promise<Result<ConnectionState>>
    clearToken(): Promise<Result<null>>
  }
  sportmonks: {
    refreshSubscription(): Promise<Result<SubscriptionRefresh>>
    refreshFixtureTv(input: RefreshFixtureInput): Promise<Result<FixtureTvRefresh>>
    refreshFixturePressure(input: RefreshFixtureInput): Promise<Result<FixturePressureRefresh>>
    refreshTeamOfWeek(input: RefreshTeamOfWeekInput): Promise<Result<TeamOfWeekRefresh>>
    refreshTeamRivals: (input: RefreshTeamInput) => Promise<Result<TeamRivalsRefresh>>
    refreshFixtureCommentary: (
      input: RefreshFixtureInput
    ) => Promise<Result<FixtureCommentaryRefresh>>
    refreshSeasonSchedule: (
      input: RefreshSeasonScheduleInput
    ) => Promise<Result<SeasonScheduleRefresh>>
    refreshFixtures(input: RefreshFixturesInput): Promise<Result<FixtureRefresh>>
    refreshFixtureWindow(input: RefreshFixtureWindowInput): Promise<Result<FixtureRefresh>>
    refreshFixture(input: RefreshFixtureInput): Promise<Result<FixtureDetailRefresh>>
    refreshFixtureHeadToHead(input: RefreshFixtureHeadToHeadInput): Promise<Result<FixtureRefresh>>
    refreshFixtureOdds(input: RefreshFixtureOddsInput): Promise<Result<FixtureOddsRefresh>>
    refreshCompetitions(): Promise<Result<CompetitionRefresh>>
    refreshCompetitionSeasons(
      input: RefreshCompetitionSeasonsInput
    ): Promise<Result<CompetitionSeasonsRefresh>>
    refreshStandings(input: RefreshStandingsInput): Promise<Result<StandingsRefresh>>
    refreshRoundStandings(input: RefreshRoundStandingsInput): Promise<Result<StandingsRefresh>>
    refreshSeasonStatistics(
      input: RefreshSeasonStatisticsInput
    ): Promise<Result<SeasonStatisticsRefresh>>
    refreshSeasonTopscorers(
      input: RefreshSeasonTopscorersInput
    ): Promise<Result<SeasonTopscorersRefresh>>
    refreshCompetitionFixtures(
      input: RefreshCompetitionFixturesInput
    ): Promise<Result<FixtureRefresh>>
    refreshTeam(input: RefreshTeamInput): Promise<Result<TeamRefresh>>
    refreshTeamFixtures(input: RefreshTeamFixturesInput): Promise<Result<FixtureRefresh>>
    refreshTeamSquad(input: RefreshTeamSquadInput): Promise<Result<TeamSquadRefresh>>
    refreshTeamStatistics(input: RefreshTeamStatisticsInput): Promise<Result<TeamStatisticsRefresh>>
    refreshTeamTransfers(input: RefreshTeamTransfersInput): Promise<Result<TransfersRefresh>>
    refreshTransferFeed(input: RefreshTransferFeedInput): Promise<Result<TransferFeedRefresh>>
    refreshVenue(input: RefreshVenueInput): Promise<Result<VenueRefresh>>
    refreshPlayer(input: RefreshPlayerInput): Promise<Result<PlayerRefresh>>
    refreshCoach(input: RefreshCoachInput): Promise<Result<CoachRefresh>>
    refreshReferee(input: RefreshRefereeInput): Promise<Result<RefereeRefresh>>
    refreshPlayerAppearances(
      input: RefreshPlayerAppearancesInput
    ): Promise<Result<PlayerAppearancesRefresh>>
    refreshPlayerStatistics(
      input: RefreshPlayerStatisticsInput
    ): Promise<Result<PlayerStatisticsRefresh>>
    refreshPlayerTransfers(input: RefreshPlayerTransfersInput): Promise<Result<TransfersRefresh>>
    getRateLimit(): Promise<SportmonksRateLimit | null>
    onRateLimitChange(listener: (rateLimit: SportmonksRateLimit) => void): () => void
    searchEntities(input: EntitySearchInput): Promise<Result<EntitySearchRefresh>>
  }
}
