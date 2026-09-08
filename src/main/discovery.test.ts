import { describe, expect, it, vi } from 'vitest'
import {
  fetchPlayerDirectory,
  fetchCountryCompetitions,
  fetchTeamSeasons,
  validatePlayerDirectoryInput,
  validateCountryCompetitionsInput,
  validateTeamSeasonsInput
} from './discovery'

const player = {
  id: 1,
  sport_id: 1,
  country_id: 47,
  nationality_id: 462,
  city_id: null,
  position_id: 26,
  detailed_position_id: 150,
  type_id: 26,
  name: 'Player',
  display_name: 'Player',
  height: null,
  weight: null,
  date_of_birth: null,
  gender: null,
  country: { id: 47, name: 'Sweden' },
  nationality: { id: 462, name: 'England' },
  position: { id: 26, name: 'Midfielder' },
  detailedposition: { id: 150, name: 'Attacking Midfield' }
}
const competition = { id: 8, country_id: 47, name: 'League', active: true }
const season = { id: 12, league_id: 8, name: '2025/26', is_current: 0, league: competition }
const response = (data: unknown[], page = 1, hasMore = false): Response =>
  Response.json({ data, pagination: { current_page: page, has_more: hasMore } })

describe('football discovery endpoints', () => {
  it.each([
    [{ page: 1 }, '/players'],
    [{ page: 2, countryId: 47 }, '/players/countries/47'],
    [{ page: 1, query: 'Name & Name' }, '/players/search/Name%20%26%20Name']
  ])(
    'reads one explicit player page with normalized position and distinct country/nationality %j',
    async (input, path) => {
      const fetcher = vi.fn().mockResolvedValue(response([player], input.page, true))
      const result = await fetchPlayerDirectory(input, 'token', fetcher)
      expect(result.players[0]).toMatchObject({
        country_id: 47,
        nationality_id: 462,
        detailedPosition: { name: 'Attacking Midfield' }
      })
      expect(result.hasMore).toBe(true)
      const url = new URL(fetcher.mock.calls[0][0])
      expect(url.pathname).toBe('/v3/football' + path)
      expect(url.searchParams.get('include')).toBe('country;nationality;position;detailedPosition')
      expect(fetcher).toHaveBeenCalledTimes(1)
    }
  )
  it('rejects a mismatched player page, missing pagination and foreign relationships', async () => {
    for (const body of [
      { data: [player] },
      { data: [player], pagination: { current_page: 2, has_more: false } },
      { data: [{ ...player, country_id: 462 }], pagination: { current_page: 1, has_more: false } },
      {
        data: [{ ...player, detailedposition: { id: 99, name: 'Other' } }],
        pagination: { current_page: 1, has_more: false }
      }
    ])
      await expect(
        fetchPlayerDirectory({ page: 1, countryId: 47 }, 'token', async () => Response.json(body))
      ).rejects.toMatchObject({ code: 'invalid_response' })
  })
  it('consumes the complete country competition list and normalizes currentSeason', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response([{ ...competition, currentSeason: season }], 1, true))
      .mockResolvedValueOnce(response([{ ...competition, id: 9 }], 2))
    const result = await fetchCountryCompetitions({ countryId: 47 }, 'token', fetcher)
    expect(result.competitions.map(({ id }) => id)).toEqual([8, 9])
    expect(result.competitions[0].currentseason).toMatchObject({ id: 12, is_current: false })
    expect(result.pageCount).toBe(2)
    expect(new URL(fetcher.mock.calls[0][0]).pathname).toBe('/v3/football/leagues/countries/47')
  })
  it('rejects partial country lists and wrong season/country relationships', async () => {
    const partial = vi
      .fn()
      .mockResolvedValueOnce(response([competition], 1, true))
      .mockResolvedValueOnce(Response.json({ data: [] }))
    await expect(
      fetchCountryCompetitions({ countryId: 47 }, 'token', partial)
    ).rejects.toMatchObject({ code: 'invalid_response' })
    for (const record of [
      { ...competition, country_id: 9 },
      { ...competition, currentseason: { ...season, league_id: 9 } }
    ])
      await expect(
        fetchCountryCompetitions({ countryId: 47 }, 'token', async () => response([record]))
      ).rejects.toMatchObject({ code: 'invalid_response' })
  })
  it('reads every non-paginated team season without inferring current membership', async () => {
    const records = Array.from({ length: 96 }, (_, id) => ({ ...season, id: id + 1 }))
    const fetcher = vi.fn().mockResolvedValue(Response.json({ data: records }))
    const result = await fetchTeamSeasons({ teamId: 19 }, 'token', fetcher)
    expect(result.seasons).toHaveLength(96)
    const url = new URL(fetcher.mock.calls[0][0])
    expect(url.pathname).toBe('/v3/football/seasons/teams/19')
    expect([...url.searchParams.entries()]).toEqual([['include', 'league']])
    expect(fetcher).toHaveBeenCalledTimes(1)
    await expect(
      fetchTeamSeasons({ teamId: 19 }, 'token', async () =>
        Response.json({ data: [{ ...season, league_id: 10 }] })
      )
    ).rejects.toMatchObject({ code: 'invalid_response' })
  })
  it('keeps access denial distinct from empty results and validates filters', async () => {
    await expect(
      fetchPlayerDirectory({ page: 1 }, 'token', async () =>
        Response.json({ message: 'No access' }, { status: 403 })
      )
    ).rejects.toMatchObject({ code: 'forbidden' })
    expect(validatePlayerDirectoryInput({ page: 1, query: '  Player  ' })).toEqual({
      page: 1,
      query: 'Player'
    })
    for (const input of [
      { page: 0 },
      { page: 1, query: 'x' },
      { page: 1, query: 'Player', countryId: 47 }
    ])
      expect(() => validatePlayerDirectoryInput(input)).toThrow()
    expect(() => validateCountryCompetitionsInput({ countryId: -1 })).toThrow()
    expect(() => validateTeamSeasonsInput({ teamId: 0 })).toThrow()
  })
})
