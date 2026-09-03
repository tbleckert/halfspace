import { afterAll, beforeEach, expect, it } from 'vitest'
import { clearSportmonksCache, db, readStatisticSeasons, writeStatisticSeasonsRefresh } from './db'

beforeEach(clearSportmonksCache)
afterAll(() => db.close())

it('caches season catalogs by entity without replacing performance data or accepting older responses', async () => {
  const input = { entity: 'players' as const, entityId: 100 }
  const record = {
    season: { id: 12, league_id: 8, name: '2026/27', is_current: true },
    teamId: 19,
    teamName: 'Arsenal',
    competitionName: 'Premier League'
  }
  await writeStatisticSeasonsRefresh(input, { records: [record], fetchedAt: 2000 })
  await writeStatisticSeasonsRefresh(input, { records: [], fetchedAt: 1000 })
  expect((await readStatisticSeasons(input))?.records).toEqual([record])
  expect(await readStatisticSeasons({ entity: 'teams', entityId: 100 })).toBeNull()
  expect(await db.playerStatisticsQueries.count()).toBe(0)
  await clearSportmonksCache()
  expect(await readStatisticSeasons(input)).toBeNull()
})
