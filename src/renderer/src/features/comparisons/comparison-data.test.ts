import { expect, it } from 'vitest'
import type { SportmonksPlayerStatistic } from '@shared/contracts'
import { playerStatisticsSummary } from '@/features/statistics/statistics-data'
import { comparisonRows, playerComparisonRecord, playerRadarRows } from './comparison-data'

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

it('compares player contributions per 90 using each selected record’s minutes', () => {
  const empty = playerStatisticsSummary([])
  const rows = playerRadarRows(
    { ...empty, minutes: 180, goals: 2, assists: 0, shots: 10 },
    { ...empty, minutes: 900, goals: 5, assists: 0, shots: 20 }
  )
  expect(rows).toEqual([
    { label: 'Goals', left: 1, right: 0.5, leftRatio: 1, rightRatio: 0.5 },
    { label: 'Assists', left: 0, right: 0, leftRatio: 0, rightRatio: 0 },
    { label: 'Shots', left: 5, right: 2, leftRatio: 1, rightRatio: 0.4 }
  ])
})

it('excludes unknown metrics without making them zero and requires reported playing time', () => {
  const empty = playerStatisticsSummary([])
  const first = { ...empty, minutes: 90, goals: 0, assists: 1 }
  const second = { ...empty, minutes: 180, goals: 2 }
  expect(playerRadarRows(first, second)).toEqual([
    { label: 'Goals', left: 0, right: 1, leftRatio: 0, rightRatio: 1 }
  ])
  expect(playerRadarRows({ ...first, minutes: null }, second)).toEqual([])
  expect(playerRadarRows(first, { ...second, minutes: 0 })).toEqual([])
})
