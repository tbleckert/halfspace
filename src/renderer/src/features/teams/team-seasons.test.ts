import { expect, it } from 'vitest'
import { groupTeamSeasons } from './team-seasons-data'
import { seasonFixtureDate } from '@/features/competitions/competition-workspace-data'

it('groups reported seasons by competition and retains old seasons with season-specific dates', () => {
  const league = { id: 8, country_id: 1, name: 'League', active: true }
  const old = {
    id: 1,
    league_id: 8,
    name: '1999/00',
    is_current: false,
    starting_at: '1999-08-01',
    ending_at: '2000-05-31',
    league
  }
  const recent = {
    ...old,
    id: 2,
    name: '2025/26',
    starting_at: '2025-08-01',
    ending_at: '2026-05-31'
  }
  const unknownLeague = { id: 3, league_id: 9, name: '2020', is_current: false }
  const groups = groupTeamSeasons([old, unknownLeague, recent])
  expect(groups[0].seasons.map(({ id }) => id)).toEqual([2, 1])
  expect(groups[1].name).toBe('Competition 9')
  expect(seasonFixtureDate(old, '2026-09-08')).toBe('2000-05-31')
  expect(old.is_current).toBe(false)
})
