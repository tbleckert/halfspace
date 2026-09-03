import { describe, expect, it, vi } from 'vitest'
import { fetchFixturePressure } from './fixture-pressure'

const point = { id: 1, fixture_id: 10, participant_id: 37, minute: 6, pressure: 10.92 }

describe('fixture pressure', () => {
  it('fetches the pressure include without replacing fixture detail', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: { id: 10, pressure: [point] } }))
    const result = await fetchFixturePressure({ fixtureId: 10 }, 'token', fetcher)
    expect(result.points).toEqual([point])
    const url = new URL(String(fetcher.mock.calls[0][0]))
    expect(url.pathname).toBe('/v3/football/fixtures/10')
    expect(url.searchParams.get('include')).toBe('pressure')
    expect(url.searchParams.get('select')).toBe('id')
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('preserves a confirmed empty response', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: { id: 10, pressure: [] } }))
    expect((await fetchFixturePressure({ fixtureId: 10 }, 'token', fetcher)).points).toEqual([])
  })

  it.each([
    { id: 10 },
    { id: 11, pressure: [] },
    { id: 10, pressure: [{ ...point, fixture_id: 11 }] },
    { id: 10, pressure: [{ ...point, minute: -1 }] },
    { id: 10, pressure: [{ ...point, pressure: null }] },
    { id: 10, pressure: [{ ...point, pressure: -10 }] }
  ])('rejects missing, malformed or unrelated readings: %j', async (data) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data }))
    await expect(fetchFixturePressure({ fixtureId: 10 }, 'token', fetcher)).rejects.toMatchObject({
      code: 'invalid_response'
    })
  })
})
