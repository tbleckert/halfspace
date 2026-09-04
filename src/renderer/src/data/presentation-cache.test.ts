import { afterAll, beforeEach, expect, it } from 'vitest'
import {
  clearSportmonksCache,
  db,
  readHonours,
  readMatchFacts,
  writeHonoursRefresh,
  writeMatchFactsRefresh
} from './db'
beforeEach(clearSportmonksCache)
afterAll(() => db.close())
it('keeps honour records isolated by entity kind and rejects wrong identities', async () => {
  const team = { entity: 'teams' as const, entityId: 19 }
  const refresh = { ...team, honours: [], fetchedAt: 200 }
  await writeHonoursRefresh(team, refresh)
  await writeHonoursRefresh(team, { ...refresh, fetchedAt: 100 })
  expect((await readHonours(team))?.fetchedAt).toBe(200)
  expect(await readHonours({ entity: 'players', entityId: 19 })).toBeNull()
  await expect(writeHonoursRefresh({ entity: 'players', entityId: 19 }, refresh)).rejects.toThrow()
  await clearSportmonksCache()
  expect(await readHonours(team)).toBeNull()
})
it('preserves complete fact snapshots and rejects wrong-fixture writes', async () => {
  const refresh = {
    fixtureId: 10,
    fetchedAt: 200,
    facts: [
      {
        id: 1,
        fixture_id: 10,
        type_id: 1,
        participant: 'home' as const,
        basis: 'team',
        scope: 'league_matches',
        category: 'streaks',
        natural_language: 'Unbeaten in 87 of 100 matches.',
        type: null
      }
    ]
  }
  await writeMatchFactsRefresh(10, refresh)
  await writeMatchFactsRefresh(10, { ...refresh, fetchedAt: 100, facts: [] })
  expect((await readMatchFacts(10))?.facts).toHaveLength(1)
  await expect(writeMatchFactsRefresh(11, refresh)).rejects.toThrow()
  expect(await readMatchFacts(11)).toBeNull()
  await clearSportmonksCache()
  expect(await readMatchFacts(10)).toBeNull()
})
