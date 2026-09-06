import { expect, it, vi } from 'vitest'
import { fetchTvGuide } from './tv-guide'
const input = { startDate: '2026-09-06', endDate: '2026-09-07', timeZone: 'Europe/Stockholm' }
const fixture = {
  id: 10,
  league_id: 8,
  season_id: 12,
  state_id: 1,
  placeholder: false,
  has_odds: false,
  tvstations: []
}
it('fetches every page with fixture-specific countries and the requested timezone', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({ data: [fixture], pagination: { current_page: 1, has_more: true } })
    )
    .mockResolvedValueOnce(
      Response.json({
        data: [{ ...fixture, id: 11 }],
        pagination: { current_page: 2, has_more: false }
      })
    )
  const result = await fetchTvGuide(input, 'token', fetcher)
  expect(result.fixtures.map((f) => f.id)).toEqual([10, 11])
  const url = new URL(String(fetcher.mock.calls[0][0]))
  expect(url.searchParams.get('timezone')).toBe(input.timeZone)
  expect(url.searchParams.get('include')).toContain('tvStations.country')
})
it('rejects incomplete pagination and failed later pages', async () => {
  await expect(
    fetchTvGuide(input, 'token', async () => Response.json({ data: [fixture] }))
  ).rejects.toMatchObject({ code: 'invalid_response' })
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({ data: [fixture], pagination: { current_page: 1, has_more: true } })
    )
    .mockResolvedValueOnce(
      Response.json({ data: [], pagination: { current_page: 1, has_more: false } })
    )
  await expect(fetchTvGuide(input, 'token', fetcher)).rejects.toMatchObject({
    code: 'invalid_response'
  })
})
