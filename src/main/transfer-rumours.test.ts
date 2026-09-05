import { expect, it, vi } from 'vitest'
import { fetchTransferRumours, validateTransferRumoursInput } from './transfer-rumours'

const rumour = {
  id: 5,
  player_id: 7,
  from_team_id: 1,
  to_team_id: 2,
  type_id: 219,
  probability: 'LOW',
  source_name: 'Paper',
  source_url: 'https://example.com/story',
  amount: 100,
  currency: 'EUR',
  date: '2026-09-01'
}

it.each(['teams', 'players'] as const)(
  'reads an explicit %s rumour page without turning probability into certainty',
  async (entity) => {
    const input = { entity, entityId: entity === 'teams' ? 1 : 7, page: 2 }
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ data: [rumour], pagination: { current_page: 2, has_more: true } })
    )
    const result = await fetchTransferRumours(input, 'token', fetcher)
    expect(result).toMatchObject({
      ...input,
      hasMore: true,
      rumours: [{ probability: 'LOW', currency: 'EUR' }]
    })
    expect(new URL(String(fetcher.mock.calls[0][0])).pathname).toBe(
      `/v3/football/transfer-rumours/${entity}/${input.entityId}`
    )
    expect(fetcher).toHaveBeenCalledOnce()
  }
)

it('rejects unrelated players, clubs, page mismatches and incomplete pagination', async () => {
  const input = { entity: 'teams' as const, entityId: 1, page: 1 }
  for (const data of [
    { data: [rumour] },
    { data: [rumour], pagination: { current_page: 2, has_more: false } },
    { data: [{ ...rumour, from_team_id: 3 }], pagination: { current_page: 1, has_more: false } },
    {
      data: [{ ...rumour, toTeam: { id: 99, name: 'Wrong club' } }],
      pagination: { current_page: 1, has_more: false }
    }
  ]) {
    await expect(
      fetchTransferRumours(input, 'token', async () => Response.json(data))
    ).rejects.toMatchObject({ code: 'invalid_response' })
  }
  expect(() => validateTransferRumoursInput({ ...input, entity: 'coaches' })).toThrow()
  expect(() => validateTransferRumoursInput({ ...input, page: 0 })).toThrow()
})
