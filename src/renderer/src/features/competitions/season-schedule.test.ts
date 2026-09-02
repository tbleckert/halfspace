import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  clearSportmonksCache,
  db,
  readSeasonSchedule,
  writeSeasonScheduleRefresh,
  writeFixtureDetailRefresh
} from '@/data/db'
import { selectedSchedulePart, sortScheduleRounds } from './season-schedule-data'

beforeEach(() => clearSportmonksCache())
afterAll(() => db.close())

describe('season schedules', () => {
  it('keeps live schedule scores on the shared 30-second refresh cadence', async () => {
    const fetchedAt = Date.now()
    await writeSeasonScheduleRefresh(12, {
      fetchedAt,
      stages: [
        {
          id: 1,
          season_id: 12,
          name: 'Final',
          sort_order: 1,
          finished: false,
          is_current: true,
          rounds: [],
          fixtures: [
            {
              id: 50,
              league_id: 8,
              season_id: 12,
              state_id: 2,
              placeholder: false,
              has_odds: false,
              participants: [],
              scores: []
            }
          ]
        }
      ]
    })
    expect((await readSeasonSchedule(12))?.staleAt).toBe(fetchedAt + 30_000)
  })

  it('defaults to the current round and respects an explicit selection', () => {
    const rounds = [
      { id: 1, is_current: false, finished: true },
      { id: 2, is_current: true, finished: false }
    ]
    expect(selectedSchedulePart(rounds)?.id).toBe(2)
    expect(selectedSchedulePart(rounds, 1)?.id).toBe(1)
    expect(selectedSchedulePart(rounds, 999)?.id).toBe(2)
  })
  it('sorts numbered rounds naturally when dates are not known', () => {
    expect(
      sortScheduleRounds([{ name: '10' }, { name: '2' }, { name: '1' }]).map((r) => r.name)
    ).toEqual(['1', '2', '10'])
  })
  it('stores the complete structure per season and reuses detailed fixture records', async () => {
    const fixture = {
      id: 50,
      league_id: 8,
      season_id: 12,
      state_id: 1,
      placeholder: false,
      has_odds: false,
      participants: [],
      scores: []
    }
    await writeFixtureDetailRefresh({
      fixture: { ...fixture, venue: { id: 2, name: 'Stadium' } },
      fetchedAt: Date.now()
    })
    await writeSeasonScheduleRefresh(12, {
      fetchedAt: Date.now(),
      stages: [
        {
          id: 1,
          season_id: 12,
          name: 'Regular season',
          sort_order: 1,
          finished: false,
          is_current: true,
          fixtures: [],
          rounds: [{ id: 2, name: '1', is_current: true, finished: false, fixtures: [fixture] }]
        }
      ]
    })
    const cached = await readSeasonSchedule(12)
    expect(cached?.stages[0].rounds[0].fixtureIds).toEqual([50])
    expect(cached?.fixtures[0].raw.venue?.name).toBe('Stadium')
    expect(await readSeasonSchedule(13)).toBeNull()
    await clearSportmonksCache()
    expect(await readSeasonSchedule(12)).toBeNull()
  })
})
