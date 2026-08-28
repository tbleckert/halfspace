export const ipcChannels = {
  connectionState: 'credentials:connection-state',
  saveToken: 'credentials:save-token',
  clearToken: 'credentials:clear-token',
  refreshFixtures: 'sportmonks:refresh-fixtures',
  refreshCompetitions: 'sportmonks:refresh-competitions',
  refreshStandings: 'sportmonks:refresh-standings',
  refreshCompetitionFixtures: 'sportmonks:refresh-competition-fixtures'
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
  }
}
