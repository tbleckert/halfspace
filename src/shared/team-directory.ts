import type { SportmonksTeam } from './contracts'

export interface TeamDirectoryInput {
  page: number
  query?: string
  countryId?: number
  seasonId?: number
}

export interface TeamDirectoryRefresh extends TeamDirectoryInput {
  teams: SportmonksTeam[]
  hasMore: boolean
  fetchedAt: number
}
