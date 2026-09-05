import type {
  SeasonScheduleRefresh,
  SportmonksReferee,
  SportmonksTeam,
  SportmonksVenue
} from './contracts'

export interface RefreshTeamScheduleInput {
  teamId: number
  seasonId: number
}

export interface TeamScheduleRefresh extends SeasonScheduleRefresh, RefreshTeamScheduleInput {}

export interface SeasonRefereesRefresh {
  seasonId: number
  referees: SportmonksReferee[]
  fetchedAt: number
}

export interface SeasonVenuesRefresh {
  seasonId: number
  venues: SportmonksVenue[]
  fetchedAt: number
}

export interface StandingCorrection {
  id: number
  season_id: number
  stage_id: number | null
  group_id: number | null
  type_id: number
  participant_type: string
  participant_id: number
  value: number
  calc_type: string | null
  active: boolean
  participant?: SportmonksTeam | null
  stage?: { id: number; name: string } | null
  group?: { id: number; name: string } | null
}

export interface StandingCorrectionsRefresh {
  seasonId: number
  corrections: StandingCorrection[]
  fetchedAt: number
}
