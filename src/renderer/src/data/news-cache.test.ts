import { afterAll, beforeEach, expect, it } from 'vitest'
import type { NewsRefresh, RefreshNewsInput } from '@shared/contracts'
import {
  clearSportmonksCache,
  db,
  readNews,
  writeNewsRefresh,
  writeFixtureDetailRefresh
} from './db'
beforeEach(clearSportmonksCache)
afterAll(() => db.close())
const input: RefreshNewsInput = { kind: 'feed', feed: 'pre-match', page: 1, seasonId: 12 }
const fixture = {
  id: 10,
  league_id: 8,
  season_id: 12,
  state_id: 1,
  placeholder: false,
  has_odds: false,
  participants: [],
  scores: []
}
const refresh: NewsRefresh = {
  articles: [
    { id: 1, fixture_id: 10, league_id: 8, type: 'prematch', title: 'Preview', lines: [], fixture }
  ],
  hasMore: true,
  fetchedAt: 200
}
it('keeps article pages separate and preserves richer article context on fixture news refreshes', async () => {
  await writeNewsRefresh(input, refresh)
  await writeNewsRefresh(
    { kind: 'fixture', fixtureId: 10 },
    {
      ...refresh,
      fetchedAt: 300,
      articles: refresh.articles.map((article) => ({ ...article, fixture: undefined }))
    }
  )
  expect((await readNews(input))?.articles[0].fixture?.season_id).toBe(12)
  expect((await readNews(input))?.hasMore).toBe(true)
  expect(await readNews({ ...input, page: 2 })).toBeNull()
  await writeNewsRefresh(input, { ...refresh, fetchedAt: 100, articles: [] })
  expect((await readNews(input))?.articles).toHaveLength(1)
})
it('does not let the partial fixture in a news article erase cached teams or scores', async () => {
  await writeFixtureDetailRefresh({
    fixture: {
      ...fixture,
      participants: [{ id: 19, name: 'Arsenal', meta: { location: 'home' } }],
      scores: [
        {
          id: 1,
          participant_id: 19,
          description: 'CURRENT',
          score: { goals: 2, participant: 'home' }
        }
      ]
    },
    fetchedAt: 100
  })
  await writeNewsRefresh(input, refresh)
  expect((await db.fixtures.get(10))?.raw.participants[0]?.name).toBe('Arsenal')
  expect((await db.fixtures.get(10))?.raw.scores[0]?.score.goals).toBe(2)
})
it('rejects a wrong-season article without creating a page', async () => {
  await expect(writeNewsRefresh({ ...input, seasonId: 13 }, refresh)).rejects.toThrow()
  expect(await readNews({ ...input, seasonId: 13 })).toBeNull()
})
