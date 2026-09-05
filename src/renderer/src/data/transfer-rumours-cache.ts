import type {
  RefreshTransferRumoursInput,
  TransferRumoursRefresh,
  SportmonksTransferRumour
} from '@shared/transfer-rumours'
import { db, toCachedIncludedPlayer, toCachedIncludedTeam } from './db'

export interface CachedTransferRumour {
  id: number
  raw: SportmonksTransferRumour
  fetchedAt: number
}
export interface TransferRumoursQuery extends RefreshTransferRumoursInput {
  key: string
  rumourIds: number[]
  hasMore: boolean
  fetchedAt: number
  staleAt: number
}

export function transferRumoursQueryKey(input: RefreshTransferRumoursInput): string {
  return `${input.entity}:${input.entityId}:${input.page}`
}

export async function readTransferRumours(
  input: RefreshTransferRumoursInput
): Promise<(TransferRumoursQuery & { rumours: SportmonksTransferRumour[] }) | null> {
  const query = await db.transferRumourQueries.get(transferRumoursQueryKey(input))
  if (!query) return null
  const rumours = (await db.transferRumours.bulkGet(query.rumourIds)).flatMap((row) =>
    row ? [row.raw] : []
  )
  return { ...query, rumours }
}

export async function writeTransferRumoursRefresh(
  input: RefreshTransferRumoursInput,
  refresh: TransferRumoursRefresh
): Promise<void> {
  const key = transferRumoursQueryKey(input)
  if (
    key !== transferRumoursQueryKey(refresh) ||
    refresh.rumours.some((row) =>
      input.entity === 'teams'
        ? row.from_team_id !== input.entityId && row.to_team_id !== input.entityId
        : row.player_id !== input.entityId
    )
  )
    throw new Error('Rumours do not match the selected page.')
  await db.transaction(
    'rw',
    [db.transferRumourQueries, db.transferRumours, db.players, db.teams],
    async () => {
      const previous = await db.transferRumourQueries.get(key)
      if (previous && previous.fetchedAt > refresh.fetchedAt) return
      const values = [...new Map(refresh.rumours.map((rumour) => [rumour.id, rumour])).values()]
      const existing = await db.transferRumours.bulkGet(values.map(({ id }) => id))
      await db.transferRumours.bulkPut(
        values.map((rumour, index) => {
          const cached = existing[index]
          return cached && cached.fetchedAt > refresh.fetchedAt
            ? cached
            : { id: rumour.id, raw: { ...cached?.raw, ...rumour }, fetchedAt: refresh.fetchedAt }
        })
      )
      const players = [
        ...new Map(
          values.flatMap(({ player }) => (player ? [[player.id, player] as const] : []))
        ).values()
      ]
      const teams = [
        ...new Map(
          values.flatMap(({ fromTeam, toTeam }) =>
            [fromTeam, toTeam].flatMap((team) => (team ? [[team.id, team] as const] : []))
          )
        ).values()
      ]
      const existingPlayers = await db.players.bulkGet(players.map(({ id }) => id))
      const existingTeams = await db.teams.bulkGet(teams.map(({ id }) => id))
      await db.players.bulkPut(
        players.map((player, index) => {
          const cached = existingPlayers[index]
          return cached && cached.fetchedAt > refresh.fetchedAt
            ? cached
            : toCachedIncludedPlayer(player, cached, refresh.fetchedAt)
        })
      )
      await db.teams.bulkPut(
        teams.map((team, index) =>
          toCachedIncludedTeam(team, existingTeams[index], refresh.fetchedAt)
        )
      )
      await db.transferRumourQueries.put({
        ...input,
        key,
        rumourIds: values.map(({ id }) => id),
        hasMore: refresh.hasMore,
        fetchedAt: refresh.fetchedAt,
        staleAt: refresh.fetchedAt + 60 * 60 * 1000
      })
    }
  )
}
