import { afterAll, beforeEach, expect, it } from 'vitest'
import { clearSportmonksCache, db, readSeasonBracket, writeSeasonBracketRefresh } from './db'
import type { SeasonBracketRefresh } from '@shared/contracts'
beforeEach(clearSportmonksCache)
afterAll(() => db.close())
const refresh: SeasonBracketRefresh = {
  fetchedAt: 200,
  catalog: [],
  edges: [],
  stages: [
    {
      stage_id: 1,
      stage_name: 'Final',
      fixtures: [
        {
          id: 10,
          league_id: 27,
          season_id: 12,
          state_id: 5,
          placeholder: false,
          has_odds: false,
          participants: [],
          scores: []
        }
      ]
    }
  ]
}

it('normalizes bracket fixtures and keeps queries monotonic and season-scoped', async () => {
  await writeSeasonBracketRefresh(12, refresh)
  await writeSeasonBracketRefresh(12, { ...refresh, stages: [], fetchedAt: 100 })
  expect((await readSeasonBracket(12))?.fixtures[0].id).toBe(10)
  expect((await db.fixtures.get(10))?.seasonId).toBe(12)
  expect(await readSeasonBracket(13)).toBeNull()
  await clearSportmonksCache()
  expect(await readSeasonBracket(12)).toBeNull()
})

it('rejects a wrong-season fixture without changing the existing snapshot', async () => {
  await writeSeasonBracketRefresh(12, refresh)
  const wrong = {
    ...refresh,
    stages: [
      { ...refresh.stages[0], fixtures: [{ ...refresh.stages[0].fixtures[0], season_id: 13 }] }
    ],
    fetchedAt: 300
  }
  await expect(writeSeasonBracketRefresh(12, wrong)).rejects.toThrow()
  expect((await readSeasonBracket(12))?.fetchedAt).toBe(200)
})
