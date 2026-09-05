import { z } from 'zod'
import type { RefreshTransferRumoursInput, TransferRumoursRefresh } from '@shared/transfer-rumours'
import { playerSchema, teamSchema } from './sportmonks'
import { requestSportmonks, SportmonksError } from './sportmonks-client'

const inputSchema = z.object({
  entity: z.enum(['teams', 'players']),
  entityId: z.number().int().positive(),
  page: z.number().int().positive()
})
const responseSchema = z.object({
  data: z.array(
    z.object({
      id: z.number().int(),
      player_id: z.number().int(),
      from_team_id: z.number().int().nullable(),
      to_team_id: z.number().int().nullable(),
      type_id: z.number().int().nullable(),
      probability: z.string().nullable(),
      source_name: z.string().nullable(),
      source_url: z.string().nullable(),
      amount: z.number().nullable(),
      currency: z.string().nullable(),
      date: z.string().nullable(),
      player: playerSchema.nullish(),
      fromTeam: teamSchema.nullish(),
      toTeam: teamSchema.nullish(),
      type: z.object({ id: z.number().int(), name: z.string() }).nullish()
    })
  ),
  pagination: z.object({ current_page: z.number().int().positive(), has_more: z.boolean() })
})

export function validateTransferRumoursInput(value: unknown): RefreshTransferRumoursInput {
  const parsed = inputSchema.safeParse(value)
  if (!parsed.success) throw new SportmonksError('invalid_input', 'Choose a valid rumour page.')
  return parsed.data
}

export async function fetchTransferRumours(
  input: RefreshTransferRumoursInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<TransferRumoursRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(
    `https://api.sportmonks.com/v3/football/transfer-rumours/${input.entity}/${input.entityId}`
  )
  url.searchParams.set('include', 'player;fromTeam;toTeam;type')
  url.searchParams.set('page', String(input.page))
  url.searchParams.set('per_page', '25')
  url.searchParams.set('order', 'desc')
  const { data, pagination } = await requestSportmonks(url, token, responseSchema, fetcher)
  if (
    pagination.current_page !== input.page ||
    data.some(
      (row) =>
        (input.entity === 'players'
          ? row.player_id !== input.entityId
          : row.from_team_id !== input.entityId && row.to_team_id !== input.entityId) ||
        (row.player && row.player.id !== row.player_id) ||
        (row.fromTeam && row.fromTeam.id !== row.from_team_id) ||
        (row.toTeam && row.toTeam.id !== row.to_team_id) ||
        (row.type && row.type.id !== row.type_id)
    )
  )
    throw new SportmonksError('invalid_response', 'Sportmonks returned a different rumour page.')
  return { ...input, rumours: data, hasMore: pagination.has_more, fetchedAt }
}
