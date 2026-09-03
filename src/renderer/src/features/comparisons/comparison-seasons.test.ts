import { expect, it } from 'vitest'
import type { StatisticSeasonRecord } from '@shared/contracts'
import { comparisonSeasons, selectedComparisonRecord } from './comparison-seasons'

const record = (
  seasonId: number,
  seasonName: string,
  teamId = 19,
  leagueId = 8
): StatisticSeasonRecord => ({
  season: { id: seasonId, name: seasonName, league_id: leagueId, is_current: false },
  competitionName: leagueId === 8 ? 'Premier League' : 'Serie A',
  teamId,
  teamName: teamId === 19 ? 'Chelsea' : 'Milan'
})

it('groups the same season across clubs and competitions without combining calendar-year seasons', () => {
  const groups = comparisonSeasons([
    record(12, '2026/2027'),
    record(22, '2026/27', 8, 384),
    record(11, '2025/2026'),
    record(30, '2026')
  ])
  expect(groups.map((g) => g.name)).toEqual(['2026/2027', '2026', '2025/2026'])
  expect(groups[0].records.map((r) => r.season.id)).toEqual([12, 22])
})

it('orders years rather than provider IDs and keeps the ten most recent season groups', () => {
  const records = Array.from({ length: 12 }, (_, i) => record(999 - i, String(2015 + i)))
  const groups = comparisonSeasons(records)
  expect(groups).toHaveLength(10)
  expect(groups[0].name).toBe('2026')
  expect(groups.at(-1)?.name).toBe('2017')
})

it('retains an explicit record, uses an automatic default, and never substitutes an unavailable selection', () => {
  const groups = comparisonSeasons([record(12, '2026/27'), record(12, '2026/2027', 8)])
  expect(selectedComparisonRecord(groups)?.teamId).toBe(19)
  expect(selectedComparisonRecord(groups, 12, 8)?.teamId).toBe(8)
  expect(selectedComparisonRecord(groups, 999)).toBeNull()
  expect(selectedComparisonRecord(groups, 12, 999)).toBeNull()
  expect(selectedComparisonRecord([])).toBeNull()
})
