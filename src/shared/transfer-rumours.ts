import type { SportmonksPlayer, SportmonksTeam, SportmonksType } from './contracts'

export interface RefreshTransferRumoursInput {
  entity: 'teams' | 'players'
  entityId: number
  page: number
}

export interface SportmonksTransferRumour {
  id: number
  player_id: number
  from_team_id: number | null
  to_team_id: number | null
  type_id: number | null
  probability: string | null
  source_name: string | null
  source_url: string | null
  amount: number | null
  currency: string | null
  date: string | null
  player?: SportmonksPlayer | null
  fromTeam?: SportmonksTeam | null
  toTeam?: SportmonksTeam | null
  type?: SportmonksType | null
}

export interface TransferRumoursRefresh extends RefreshTransferRumoursInput {
  rumours: SportmonksTransferRumour[]
  hasMore: boolean
  fetchedAt: number
}
