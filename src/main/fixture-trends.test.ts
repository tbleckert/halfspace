import { expect, it, vi } from 'vitest'
import { fetchFixtureTrends } from './fixture-trends'

const point = {
  id: 1,
  fixture_id: 10,
  participant_id: 37,
  type_id: 45,
  period_id: 100,
  minute: 47,
  value: 52
}

it('requests only displayed trends and preserves period, minute, and reported values', async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ data: { id: 10, trends: [point], periods: [] } })
  )
  const result = await fetchFixtureTrends({ fixtureId: 10 }, 'token', fetcher)
  expect(result.points).toEqual([point])
  const url = new URL(String(fetcher.mock.calls[0][0]))
  expect(url.searchParams.get('include')).toBe('trends;periods')
  expect(url.searchParams.get('filters')).toBe('trendTypes:45,42,86,34')
})

it.each([
  { id: 11, trends: [], periods: [] },
  { id: 10, trends: [{ ...point, fixture_id: 11 }], periods: [] },
  {
    id: 10,
    trends: [],
    periods: [{ id: 1, fixture_id: 11, type_id: 1, started: 1, ended: 2, ticking: false }]
  },
  { id: 10, periods: [] }
])('rejects missing or unrelated trend data', async (data) => {
  await expect(
    fetchFixtureTrends({ fixtureId: 10 }, 'token', async () => Response.json({ data }))
  ).rejects.toMatchObject({ code: 'invalid_response' })
})

it('keeps missing measurements separate from zero', async () => {
  const result = await fetchFixtureTrends({ fixtureId: 10 }, 'token', async () =>
    Response.json({ data: { id: 10, trends: [{ ...point, value: null }], periods: [] } })
  )
  expect(result.points[0].value).toBeNull()
})
