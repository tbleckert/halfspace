import { expect, it } from 'vitest'
import type { SportmonksPlayerStatistic } from '@shared/contracts'
import { comparisonRows, playerComparisonRecord } from './comparison-data'

it('preserves zero and missing data and omits metrics missing from both sides', () => {
  expect(
    comparisonRows(
      { goals: 0, assists: null, rating: null },
      { goals: 3, assists: 1, rating: null },
      [
        { key: 'goals', label: 'Goals' },
        { key: 'assists', label: 'Assists' },
        { key: 'rating', label: 'Rating' }
      ]
    )
  ).toEqual([
    { label: 'Goals', left: 0, right: 3, unit: undefined },
    { label: 'Assists', left: null, right: 1, unit: undefined }
  ])
})

it('selects one explicit club record without combining totals or averages', () => {
  const records = [
    { id: 1, team_id: 19 },
    { id: 2, team_id: 8 }
  ] as SportmonksPlayerStatistic[]
  expect(playerComparisonRecord(records, 8)).toBe(records[1])
  expect(playerComparisonRecord(records, 999)).toBeNull()
  expect(playerComparisonRecord(records)).toBe(records[0])
  expect(playerComparisonRecord([])).toBeNull()
})
