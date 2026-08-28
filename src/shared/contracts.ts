export const ipcChannels = {
  connectionState: 'credentials:connection-state',
  saveToken: 'credentials:save-token',
  clearToken: 'credentials:clear-token',
  refreshFixtures: 'sportmonks:refresh-fixtures'
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

export interface HalfspaceApi {
  credentials: {
    getConnectionState(): Promise<ConnectionState>
    saveToken(input: SaveTokenInput): Promise<Result<ConnectionState>>
    clearToken(): Promise<Result<null>>
  }
  sportmonks: {
    refreshFixtures(input: RefreshFixturesInput): Promise<Result<FixtureRefresh>>
  }
}
