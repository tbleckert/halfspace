import { expect, it } from 'vitest'
import type { CachedStanding, readSeasonSchedule } from '@/data/db'
import {
  isHalfwayThroughSchedule,
  isTopFourMatch,
  previousCompletedSeason
} from './featured-game-data'

it('uses completed fixtures, not the calendar, to determine halfway', () => {
  const schedule = (finished: number): Awaited<ReturnType<typeof readSeasonSchedule>> =>
    ({
      stages: [{ rounds: [{ fixtureIds: [1, 2, 3, 4] }] }],
      fixtures: [1, 2, 3, 4].map((id) => ({
        id,
        placeholder: false,
        stateId: id <= finished ? 5 : 1
      }))
    }) as Awaited<ReturnType<typeof readSeasonSchedule>>
  expect(isHalfwayThroughSchedule(schedule(1))).toBe(false)
  expect(isHalfwayThroughSchedule(schedule(2))).toBe(true)
  expect(isHalfwayThroughSchedule(null)).toBe(false)
  const incomplete = schedule(2)!
  incomplete.stages[0].rounds.push({
    id: 5,
    name: 'Round 5',
    finished: false,
    is_current: false,
    fixtureIds: []
  })
  expect(isHalfwayThroughSchedule(incomplete)).toBe(false)
})

it('requires one league table and two distinct top-four participants', () => {
  const table = [1, 2, 3, 4, 5, 6].map((id) => ({
    participantId: id,
    position: id,
    stageId: 1,
    groupId: null
  })) as CachedStanding[]
  expect(isTopFourMatch(table, 1, 4)).toBe(true)
  expect(isTopFourMatch(table, 1, 5)).toBe(false)
  expect(
    isTopFourMatch(
      table.map((row) => ({ ...row, groupId: 1 })),
      1,
      4
    )
  ).toBe(false)
  expect(
    isTopFourMatch(
      table.map((row) => ({ ...row, stageId: row.participantId % 2 })),
      1,
      4
    )
  ).toBe(false)
})

it('selects the previous completed season in the same competition with known dates', () => {
  const seasons = [
    {
      id: 3,
      league_id: 8,
      name: '2026/27',
      is_current: true,
      starting_at: '2026-08-01',
      ending_at: '2027-05-30'
    },
    {
      id: 2,
      league_id: 8,
      name: '2025/26',
      is_current: false,
      starting_at: '2025-08-01',
      ending_at: '2026-05-30'
    },
    { id: 1, league_id: 8, name: '2024/25', is_current: false, ending_at: '2025-05-30' },
    { id: 4, league_id: 9, name: '2026', is_current: false, ending_at: '2026-07-30' }
  ]
  expect(previousCompletedSeason(seasons, 3, '2026-09-07')?.id).toBe(2)
  expect(
    previousCompletedSeason(
      seasons.map((season) => ({ ...season, starting_at: undefined })),
      3,
      '2026-09-07'
    )
  ).toBeUndefined()
})
