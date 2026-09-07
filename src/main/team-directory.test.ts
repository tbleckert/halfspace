import { describe, expect, it, vi } from 'vitest'
import { fetchTeamDirectory, validateTeamDirectoryInput } from './team-directory'

function response(page: number, hasMore: boolean, data: unknown[] = []): Response {
  return new Response(
    JSON.stringify({ data, pagination: { current_page: page, has_more: hasMore } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
const team = {
  id: 1,
  sport_id: 1,
  country_id: 8,
  venue_id: null,
  gender: 'male',
  name: 'Example',
  founded: null,
  placeholder: false
}

describe('team directory', () => {
  it.each([
    [{ page: 1 }, '/teams'],
    [{ page: 2, countryId: 8 }, '/teams/countries/8'],
    [{ page: 1, query: 'Town & City' }, '/teams/search/Town%20%26%20City']
  ])('loads the requested directory page %j', async (input, path) => {
    const fetcher = vi.fn().mockResolvedValue(response(input.page, true, [team]))
    const result = await fetchTeamDirectory(input, 'test', fetcher)
    const url = fetcher.mock.calls[0][0] as URL
    expect(url.pathname).toBe('/v3/football' + path)
    expect(url.searchParams.get('page')).toBe(String(input.page))
    expect(url.searchParams.get('include')).toBe('country;venue')
    expect(result.hasMore).toBe(true)
    expect(result.teams).toHaveLength(1)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('browses a complete unpaginated season response', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ data: [team] }))
    const result = await fetchTeamDirectory({ page: 1, seasonId: 12 }, 'test', fetcher)
    expect(result.teams).toHaveLength(1)
    expect(result.hasMore).toBe(false)
    expect(new URL(fetcher.mock.calls[0][0]).pathname).toBe('/v3/football/teams/seasons/12')
  })
  it('rejects incorrect pages and countries instead of caching them under the requested identity', async () => {
    await expect(
      fetchTeamDirectory({ page: 2 }, 'test', vi.fn().mockResolvedValue(response(1, false)))
    ).rejects.toThrow('different')
    await expect(
      fetchTeamDirectory(
        { page: 1, countryId: 9 },
        'test',
        vi.fn().mockResolvedValue(response(1, false, [team]))
      )
    ).rejects.toThrow('different')
  })
  it('validates input and rejects conflicting remote filters', () => {
    expect(validateTeamDirectoryInput({ page: 1, query: '  Town  ' })).toEqual({
      page: 1,
      query: 'Town'
    })
    expect(() => validateTeamDirectoryInput({ page: 0 })).toThrow()
    expect(() => validateTeamDirectoryInput({ page: 1, query: 'Town', countryId: 8 })).toThrow()
  })
})
