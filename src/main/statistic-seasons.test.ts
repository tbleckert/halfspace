import { expect, it, vi } from 'vitest'
import { fetchStatisticSeasons, validateStatisticSeasonsInput } from './sportmonks'

const season = {
  id: 12,
  league_id: 8,
  name: '2026/2027',
  is_current: true,
  starting_at: '2026-08-01',
  league: { id: 8, name: 'Premier League' }
}
const record = {
  id: 1,
  player_id: 100,
  team_id: 19,
  season_id: 12,
  has_values: true,
  season,
  team: { id: 19, name: 'Arsenal' }
}

it('validates a narrow entity type and positive numeric ID', () => {
  expect(validateStatisticSeasonsInput({ entity: 'players', entityId: 100 })).toEqual({
    entity: 'players',
    entityId: 100
  })
  for (const input of [
    { entity: 'fixtures', entityId: 100 },
    { entity: 'players', entityId: '100' },
    { entity: 'teams', entityId: 0 }
  ]) {
    expect(() => validateStatisticSeasonsInput(input)).toThrow()
  }
})

it('discovers player seasons and clubs without fetching all performance details', async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({
      data: {
        id: 100,
        name: 'Alex',
        statistics: [
          record,
          { ...record, id: 2, has_values: false },
          { ...record, id: 3, season: null },
          { ...record, id: 4, season: { ...season, league: null } }
        ]
      }
    })
  )
  const result = await fetchStatisticSeasons(
    { entity: 'players', entityId: 100 },
    'private-token',
    fetcher
  )
  const url = new URL(fetcher.mock.calls[0][0].toString())
  expect(url.pathname).toBe('/v3/football/players/100')
  expect(url.searchParams.get('include')).toBe('statistics.season.league;statistics.team')
  expect(url.searchParams.has('filters')).toBe(false)
  expect(result.records).toEqual([
    {
      season: {
        id: 12,
        league_id: 8,
        name: '2026/2027',
        is_current: true,
        starting_at: '2026-08-01'
      },
      competitionName: 'Premier League',
      teamId: 19,
      teamName: 'Arsenal'
    }
  ])
})

it('uses the selected team identity for team season records', async () => {
  const teamRecord = { ...record, player_id: undefined, team: undefined }
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ data: { id: 19, name: 'Arsenal', statistics: [teamRecord] } })
  )
  const result = await fetchStatisticSeasons({ entity: 'teams', entityId: 19 }, 'token', fetcher)
  expect(new URL(fetcher.mock.calls[0][0].toString()).searchParams.get('include')).toBe(
    'statistics.season.league'
  )
  expect(result.records[0].teamName).toBe('Arsenal')
})

it('rejects mismatched entity, season, and competition relationships', async () => {
  for (const data of [
    { id: 101, name: 'Wrong player', statistics: [record] },
    { id: 100, name: 'Alex', statistics: [{ ...record, player_id: 101 }] },
    { id: 100, name: 'Alex', statistics: [{ ...record, season_id: 999 }] },
    { id: 100, name: 'Alex', statistics: [{ ...record, season: { ...season, league_id: 999 } }] }
  ]) {
    await expect(
      fetchStatisticSeasons({ entity: 'players', entityId: 100 }, 'token', async () =>
        Response.json({ data })
      )
    ).rejects.toThrow()
  }
})
