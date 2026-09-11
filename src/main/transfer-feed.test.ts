import { expect, it, vi } from 'vitest'
import { fetchTransferFeed, validateTransferFeedInput } from './sportmonks'

it('validates feed pages and the provider’s maximum 31-day range', () => {
  expect(validateTransferFeedInput({ feed: 'latest', page: 1 })).toEqual({
    feed: 'latest',
    page: 1
  })
  expect(
    validateTransferFeedInput({
      feed: 'dates',
      page: 2,
      startDate: '2026-08-01',
      endDate: '2026-08-31'
    })
  ).toMatchObject({ page: 2 })
  for (const input of [
    { feed: 'latest', page: 0 },
    { feed: 'dates', page: 1, startDate: '2026-02-30', endDate: '2026-03-01' },
    { feed: 'dates', page: 1, startDate: '2026-08-01', endDate: '2026-09-02' },
    { feed: 'dates', page: 1, startDate: '2026-09-02', endDate: '2026-08-01' }
  ])
    expect(() => validateTransferFeedInput(input)).toThrow()
})

it('keeps pagination explicit and fetches the requested latest or date page', async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ data: [], pagination: { current_page: 2, has_more: true } })
  )
  const result = await fetchTransferFeed({ feed: 'latest', page: 2 }, 'private-token', fetcher)
  const url = new URL(fetcher.mock.calls[0][0].toString())
  expect(url.pathname).toBe('/v3/football/transfers/latest')
  expect(url.searchParams.get('page')).toBe('2')
  expect(url.searchParams.get('include')).toBe(
    'player;type;fromTeam;toTeam;position;detailedPosition'
  )
  expect(url.searchParams.get('order')).toBe('desc')
  expect(result).toMatchObject({ page: 2, hasMore: true, transfers: [] })
  await fetchTransferFeed(
    { feed: 'dates', page: 2, startDate: '2026-08-01', endDate: '2026-08-31' },
    'token',
    fetcher
  )
  expect(new URL(fetcher.mock.calls[1][0].toString()).pathname).toBe(
    '/v3/football/transfers/between/2026-08-01/2026-08-31'
  )
})

it('normalizes the provider detailedposition relationship and preserves missing positions', async () => {
  const transfer = {
    id: 596014,
    sport_id: 1,
    player_id: 2,
    type_id: 219,
    from_team_id: 3,
    to_team_id: 8,
    position_id: 26,
    detailed_position_id: 150,
    date: '2026-08-01',
    career_ended: false,
    completed: true,
    position: { id: 26, name: 'Midfielder' },
    detailedposition: { id: 150, name: 'Attacking Midfield' }
  }
  const result = await fetchTransferFeed({ feed: 'latest', page: 1 }, 'token', async () =>
    Response.json({
      data: [
        transfer,
        {
          ...transfer,
          id: 2,
          position_id: null,
          detailed_position_id: null,
          position: null,
          detailedposition: null
        }
      ],
      pagination: { current_page: 1, has_more: false }
    })
  )
  expect(result.transfers[0]).toMatchObject({
    position: { id: 26, name: 'Midfielder' },
    detailedPosition: { id: 150, name: 'Attacking Midfield' }
  })
  expect(result.transfers[1]).toMatchObject({ position: null, detailedPosition: null })
})

it('does not treat absent or mismatched pagination as a complete feed', async () => {
  for (const pagination of [undefined, { current_page: 3, has_more: false }]) {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ data: [], pagination }))
    await expect(fetchTransferFeed({ feed: 'latest', page: 1 }, 'token', fetcher)).rejects.toThrow()
  }
})
