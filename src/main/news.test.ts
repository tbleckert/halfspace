import { expect, it } from 'vitest'
import { fetchNews, validateNewsInput } from './news'
const article = {
  id: 1,
  fixture_id: 10,
  league_id: 8,
  type: 'prematch',
  title: 'Preview',
  lines: [
    { id: 2, newsitem_id: 1, text: 'Away', type: 'away' },
    { id: 1, newsitem_id: 1, text: 'Home', type: 'home' }
  ],
  fixture: { id: 10, league_id: 8, season_id: 12, state_id: 1, placeholder: false, has_odds: false }
}
it('keeps page boundaries explicit and validates season and paragraph identity', async () => {
  const result = await fetchNews(
    { kind: 'feed', feed: 'pre-match', page: 2, seasonId: 12 },
    'token',
    async (url) => {
      expect(new URL(String(url)).pathname).toBe('/v3/football/news/pre-match/seasons/12')
      return Response.json({ data: [article], pagination: { current_page: 2, has_more: true } })
    }
  )
  expect(result.hasMore).toBe(true)
  expect(result.articles[0].lines).toHaveLength(2)
  await expect(
    fetchNews({ kind: 'feed', feed: 'pre-match', page: 1, seasonId: 13 }, 'token', async () =>
      Response.json({ data: [article], pagination: { current_page: 1, has_more: false } })
    )
  ).rejects.toThrow(/season/i)
})
it('fetches fixture articles without requesting unrelated fixture detail', async () => {
  const result = await fetchNews({ kind: 'fixture', fixtureId: 10 }, 'token', async () =>
    Response.json({ data: { id: 10, prematchnews: [article], postmatchnews: [] } })
  )
  expect(result.articles[0].id).toBe(1)
  expect(result.hasMore).toBe(false)
})
it('rejects invalid inputs and news returned for the wrong fixture or paragraph', async () => {
  expect(() => validateNewsInput({ kind: 'feed', feed: 'invalid', page: 1 })).toThrow()
  expect(() => validateNewsInput({ kind: 'feed', feed: 'pre-match', page: 0 })).toThrow()
  for (const bad of [
    { ...article, fixture_id: 11 },
    { ...article, lines: [{ ...article.lines[0], newsitem_id: 2 }] }
  ])
    await expect(
      fetchNews({ kind: 'fixture', fixtureId: 10 }, 'token', async () =>
        Response.json({ data: { id: 10, prematchnews: [bad], postmatchnews: [] } })
      )
    ).rejects.toThrow()
})
