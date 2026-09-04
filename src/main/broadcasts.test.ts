import { expect, it, vi } from 'vitest'
import {
  fetchBroadcaster,
  fetchBroadcastSchedule,
  validateBroadcastScheduleInput
} from './broadcasts'

const fixture = {
  id: 10,
  league_id: 8,
  season_id: 12,
  state_id: 1,
  placeholder: false,
  has_odds: false,
  tvstations: []
}
const input = { stationId: 34, feed: 'upcoming' as const, page: 2 }

it('loads one explicit broadcaster schedule page with fixture-specific regions', async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ data: [fixture], pagination: { current_page: 2, has_more: true } })
  )
  const result = await fetchBroadcastSchedule(input, 'token', fetcher)
  expect(result.hasMore).toBe(true)
  expect(result.fixtures[0].id).toBe(10)
  const url = new URL(String(fetcher.mock.calls[0][0]))
  expect(url.pathname).toBe('/v3/football/fixtures/upcoming/tv-stations/34')
  expect(url.searchParams.get('page')).toBe('2')
  expect(url.searchParams.get('include')).toContain('tvStations.country')
  expect(fetcher).toHaveBeenCalledOnce()
})

it('rejects a mismatched page and never treats missing pagination as a complete feed', async () => {
  for (const pagination of [undefined, { current_page: 1, has_more: false }]) {
    await expect(
      fetchBroadcastSchedule(input, 'token', async () =>
        Response.json({ data: [fixture], pagination })
      )
    ).rejects.toMatchObject({ code: 'invalid_response' })
  }
  expect(() => validateBroadcastScheduleInput({ ...input, page: 0 })).toThrow()
  expect(() => validateBroadcastScheduleInput({ ...input, feed: 'all' })).toThrow()
})

it('checks broadcaster identity before returning its profile', async () => {
  const station = { id: 35, name: 'Station', image_path: null, url: null }
  await expect(
    fetchBroadcaster({ stationId: 34 }, 'token', async () => Response.json({ data: station }))
  ).rejects.toMatchObject({ code: 'invalid_response' })
})
