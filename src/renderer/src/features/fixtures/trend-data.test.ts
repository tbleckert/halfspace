import { expect, it } from 'vitest'
import type { SportmonksTrend } from '@shared/contracts'
import { fixtureTrendPeriods } from './trend-data'

const point: SportmonksTrend = {
  id: 1,
  fixture_id: 10,
  participant_id: 19,
  type_id: 45,
  period_id: 1,
  minute: 47,
  value: 55
}

it('keeps overlapping first-half added time and second-half readings separate', () => {
  const periods = fixtureTrendPeriods(
    [
      point,
      { ...point, id: 2, participant_id: 8, value: 45 },
      { ...point, id: 3, period_id: 2, value: 60 }
    ],
    [],
    45,
    19,
    8
  )
  expect(periods).toHaveLength(2)
  expect(periods[0].readings).toEqual([{ minute: 47, home: 55, away: 45 }])
  expect(periods[1].readings).toEqual([{ minute: 47, home: 60, away: null }])
})

it('preserves zero and gaps, excludes unrelated teams, and sorts reported minutes', () => {
  const periods = fixtureTrendPeriods(
    [
      point,
      { ...point, id: 2, minute: 4, value: 0 },
      { ...point, id: 3, minute: 5, value: null },
      { ...point, id: 4, participant_id: 999, minute: 6, value: 99 },
      { ...point, id: 5, type_id: 42, minute: 7, value: 4 }
    ],
    [],
    45,
    19,
    8
  )
  expect(periods[0].readings).toEqual([
    { minute: 4, home: 0, away: null },
    { minute: 5, home: null, away: null },
    { minute: 47, home: 55, away: null }
  ])
})

it('resolves corrected records deterministically instead of summing measurements', () => {
  const [period] = fixtureTrendPeriods([{ ...point, id: 3, value: 52 }, point], [], 45, 19, 8)
  expect(period.readings[0].home).toBe(52)
})
