import { expect, it, vi } from 'vitest'
import { fetchFixturesByDateRange, validateFixtureWindowInput } from './sportmonks'

const input = { venueId: 206, startDate: '2026-08-13', endDate: '2026-10-12', timeZone: 'UTC' }
const fixture = {
  id: 1,
  venue_id: 206,
  league_id: 8,
  season_id: 1,
  state_id: 5,
  starting_at_timestamp: Date.parse('2026-09-10T19:00:00Z') / 1000,
  placeholder: false,
  has_odds: false,
  participants: []
}

it('validates the venue filter and retains it through every fixture page', async () => {
  expect(validateFixtureWindowInput(input)).toEqual(input)
  expect(() => validateFixtureWindowInput({ ...input, venueId: 0 })).toThrow(/venue/)
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({
        data: [fixture],
        pagination: { current_page: 1, has_more: true }
      })
    )
    .mockResolvedValueOnce(
      Response.json({
        data: [{ ...fixture, id: 2 }],
        pagination: { current_page: 2, has_more: false }
      })
    )
  const result = await fetchFixturesByDateRange(input, 'token', fetcher)
  expect(result.fixtures.map(({ id }) => id)).toEqual([1, 2])
  for (const [url] of fetcher.mock.calls) {
    expect(new URL(String(url)).searchParams.get('filters')).toBe('venues:206')
  }
})

it('accepts the observed empty first page without pagination', async () => {
  const result = await fetchFixturesByDateRange(input, 'token', async () =>
    Response.json({ data: [] })
  )
  expect(result.fixtures).toEqual([])
})

it.each([
  { data: [{ ...fixture, venue_id: 999 }], pagination: { current_page: 1, has_more: false } },
  { data: [fixture] },
  { data: [fixture], pagination: { current_page: 2, has_more: false } },
  { data: [fixture], pagination: { current_page: 1, has_more: false }, timezone: 'Asia/Tokyo' }
])('rejects a mismatched or unverified venue page', async (body) => {
  await expect(
    fetchFixturesByDateRange(input, 'token', async () => Response.json(body))
  ).rejects.toThrow()
})

it('rejects a later page that drops pagination', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({
        data: [fixture],
        pagination: { current_page: 1, has_more: true }
      })
    )
    .mockResolvedValueOnce(Response.json({ data: [] }))
  await expect(fetchFixturesByDateRange(input, 'token', fetcher)).rejects.toThrow()
})
