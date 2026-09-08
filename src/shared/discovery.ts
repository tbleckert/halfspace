import type {
  SportmonksPlayer,
  SportmonksSeason,
  SportmonksCompetition,
  CompetitionRefresh
} from './contracts'

export interface PlayerDirectoryInput {
  page: number
  query?: string
  countryId?: number
}
export interface PlayerDirectoryRefresh extends PlayerDirectoryInput {
  players: SportmonksPlayer[]
  hasMore: boolean
  fetchedAt: number
}
export interface CountryCompetitionsInput {
  countryId: number
}
export interface CountryCompetitionsRefresh extends CompetitionRefresh, CountryCompetitionsInput {}
export interface TeamSeasonsInput {
  teamId: number
}
export interface TeamSeason extends SportmonksSeason {
  league?: SportmonksCompetition | null
}
export interface TeamSeasonsRefresh extends TeamSeasonsInput {
  seasons: TeamSeason[]
  fetchedAt: number
}
