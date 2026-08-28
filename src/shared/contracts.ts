export const ipcChannels = {
  connectionState: 'credentials:connection-state',
  saveToken: 'credentials:save-token',
  clearToken: 'credentials:clear-token',
  refreshFixtures: 'sportmonks:refresh-fixtures',
  refreshCompetitions: 'sportmonks:refresh-competitions',
  refreshStandings: 'sportmonks:refresh-standings',
  refreshCompetitionFixtures: 'sportmonks:refresh-competition-fixtures',
  refreshTeam: 'sportmonks:refresh-team',
  refreshTeamFixtures: 'sportmonks:refresh-team-fixtures',
  refreshTeamSquad: 'sportmonks:refresh-team-squad',
  refreshVenue: 'sportmonks:refresh-venue',
  refreshPlayer: 'sportmonks:refresh-player',
  refreshPlayerAppearances: 'sportmonks:refresh-player-appearances'
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

export type Result<T> =
  { ok: true; data: T } | { ok: false; error: { code: ApiErrorCode; message: string } }

export interface ConnectionState {
  configured: boolean
}

export interface SaveTokenInput {
  token: string
}

export interface RefreshFixturesInput {
  date: string
  timeZone: string
}

export interface RefreshStandingsInput {
  seasonId: number
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
}

export interface RefreshPlayerInput {
  playerId: number
}

export interface RefreshPlayerAppearancesInput {
  playerId: number
  teamId: number
  startDate: string
  endDate: string
  timeZone: string
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
  country_id: number
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
}

export interface SportmonksPosition {
  id: number
  name: string
  code?: string | null
  developer_name?: string | null
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

export interface SportmonksScore {
  id: number
  participant_id: number
  description?: string
  score: {
    goals: number
    participant: 'home' | 'away'
  }
}

export interface SportmonksFixture {
  id: number
  league_id: number
  season_id: number
  state_id: number
  name?: string | null
  starting_at?: string | null
  starting_at_timestamp?: number | null
  result_info?: string | null
  placeholder: boolean
  has_odds: boolean
  participants: SportmonksParticipant[]
  league?: SportmonksLeague | null
  state?: SportmonksState | null
  scores: SportmonksScore[]
  lineups?: SportmonksLineup[]
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
}

export interface SportmonksStandingContext {
  id: number
  name: string
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

export interface StandingsRefresh {
  standings: SportmonksStanding[]
  fetchedAt: number
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

export interface HalfspaceApi {
  credentials: {
    getConnectionState(): Promise<ConnectionState>
    saveToken(input: SaveTokenInput): Promise<Result<ConnectionState>>
    clearToken(): Promise<Result<null>>
  }
  sportmonks: {
    refreshFixtures(input: RefreshFixturesInput): Promise<Result<FixtureRefresh>>
    refreshCompetitions(): Promise<Result<CompetitionRefresh>>
    refreshStandings(input: RefreshStandingsInput): Promise<Result<StandingsRefresh>>
    refreshCompetitionFixtures(
      input: RefreshCompetitionFixturesInput
    ): Promise<Result<FixtureRefresh>>
    refreshTeam(input: RefreshTeamInput): Promise<Result<TeamRefresh>>
    refreshTeamFixtures(input: RefreshTeamFixturesInput): Promise<Result<FixtureRefresh>>
    refreshTeamSquad(input: RefreshTeamSquadInput): Promise<Result<TeamSquadRefresh>>
    refreshVenue(input: RefreshVenueInput): Promise<Result<VenueRefresh>>
    refreshPlayer(input: RefreshPlayerInput): Promise<Result<PlayerRefresh>>
    refreshPlayerAppearances(
      input: RefreshPlayerAppearancesInput
    ): Promise<Result<PlayerAppearancesRefresh>>
  }
}
