import { describe, expect, it, vi } from 'vitest'
import { fetchFixtureTv } from './fixture-tv'

describe('fixture TV guide', () => {
  it('uses fixture-specific station and country relationships', async () => {
    const listing = {
      id: 1,
      fixture_id: 10,
      tvstation_id: 41,
      country_id: 251,
      tvstation: { id: 41, name: 'DAZN', url: 'https://www.dazn.com', image_path: null },
      country: { id: 251, name: 'Italy', image_path: null }
    }
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: { id: 10, tvstations: [listing] } }))
    const result = await fetchFixtureTv({ fixtureId: 10 }, 'token', fetcher)
    expect(result.listings).toEqual([listing])
    const url = new URL(String(fetcher.mock.calls[0][0]))
    expect(url.pathname).toBe('/v3/football/fixtures/10')
    expect(url.searchParams.get('include')).toBe('tvStations.tvStation;tvStations.country')
    expect(url.searchParams.get('select')).toBe('id')
  })

  it('accepts a confirmed empty guide but not an omitted relationship', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ data: { id: 10, tvstations: [] } }))
      .mockResolvedValueOnce(Response.json({ data: { id: 10 } }))
    expect((await fetchFixtureTv({ fixtureId: 10 }, 'token', fetcher)).listings).toEqual([])
    await expect(fetchFixtureTv({ fixtureId: 10 }, 'token', fetcher)).rejects.toMatchObject({
      code: 'invalid_response'
    })
  })

  it('rejects a response for another fixture', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: { id: 11, tvstations: [] } }))
    await expect(fetchFixtureTv({ fixtureId: 10 }, 'token', fetcher)).rejects.toMatchObject({
      code: 'invalid_response'
    })
  })
})
