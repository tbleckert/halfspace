import { expect, it } from 'vitest'
import { teamStatisticsSummary } from '@/features/statistics/statistics-data'

const statistics = [
  {
    type_id: 52,
    value: {
      all: { count: 8, average: 2 },
      home: { count: 6, average: 3 },
      away: { count: 2, average: 1 }
    }
  },
  { type_id: 27263, value: { total: 4, home: 2, away: 2 } },
  { type_id: 214, value: { all: { count: 3 }, home: { count: 2 }, away: { count: 1 } } },
  { type_id: 215, value: { all: { count: 0 }, home: { count: 0 }, away: { count: 0 } } },
  { type_id: 45, value: { average: 60 } }
]

it('reads reported home and away figures including zero without borrowing season totals', () => {
  expect(teamStatisticsSummary(statistics, 'home')).toMatchObject({
    goalsFor: 6,
    goalsForPerMatch: 3,
    matches: 2,
    wins: 2,
    draws: 0,
    averagePossession: null
  })
  expect(teamStatisticsSummary(statistics, 'away')).toMatchObject({
    goalsFor: 2,
    goalsForPerMatch: 1,
    matches: 2,
    wins: 1,
    draws: 0,
    averagePossession: null
  })
  expect(teamStatisticsSummary(statistics)).toMatchObject({
    goalsFor: 8,
    matches: 4,
    averagePossession: 60
  })
})

it('preserves missing split values as unknown', () => {
  expect(
    teamStatisticsSummary(
      [{ type_id: 52, value: { all: { count: 8 }, home: { count: 6 } } }],
      'away'
    ).goalsFor
  ).toBeNull()
})
