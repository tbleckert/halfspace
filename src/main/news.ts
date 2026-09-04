import { z } from 'zod'
import type { NewsRefresh, RefreshNewsInput } from '@shared/contracts'
import { fixtureSchema } from './sportmonks'
import { requestSportmonks, SportmonksError } from './sportmonks-client'

const inputSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('feed'),
    feed: z.enum(['pre-match', 'post-match']),
    page: z.number().int().min(1).max(10_000),
    seasonId: z.number().int().positive().optional()
  }),
  z.object({ kind: z.literal('fixture'), fixtureId: z.number().int().positive() })
])
export function validateNewsInput(value: unknown): RefreshNewsInput {
  const result = inputSchema.safeParse(value)
  if (!result.success)
    throw new SportmonksError('invalid_input', 'Select a valid news feed or fixture.')
  return result.data
}
const articleSchema = z.object({
  id: z.number().int(),
  fixture_id: z.number().int(),
  league_id: z.number().int(),
  title: z.string(),
  type: z.enum(['prematch', 'postmatch']),
  lines: z.array(
    z.object({
      id: z.number().int(),
      newsitem_id: z.number().int(),
      text: z.string(),
      type: z.string()
    })
  ),
  fixture: fixtureSchema.nullish(),
  league: z
    .object({ id: z.number().int(), name: z.string(), image_path: z.string().nullish() })
    .nullish()
})
const pageSchema = z.object({
  data: z.array(articleSchema),
  pagination: z.object({ current_page: z.number().int().positive(), has_more: z.boolean() })
})
const fixtureNewsSchema = z.object({
  data: z.object({
    id: z.number().int(),
    prematchnews: z.array(articleSchema),
    postmatchnews: z.array(articleSchema)
  })
})

export async function fetchNews(
  input: RefreshNewsInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<NewsRefresh> {
  const fetchedAt = Date.now()
  let result: NewsRefresh
  if (input.kind === 'fixture') {
    const url = new URL(`https://api.sportmonks.com/v3/football/fixtures/${input.fixtureId}`)
    url.searchParams.set('include', 'prematchNews.lines;postmatchNews.lines')
    url.searchParams.set('select', 'id')
    const { data } = await requestSportmonks(url, token, fixtureNewsSchema, fetcher)
    if (data.id !== input.fixtureId)
      throw new SportmonksError('invalid_response', 'Sportmonks returned news for another fixture.')
    result = { articles: [...data.prematchnews, ...data.postmatchnews], hasMore: false, fetchedAt }
  } else {
    const url = new URL(
      `https://api.sportmonks.com/v3/football/news/${input.feed}${input.seasonId ? `/seasons/${input.seasonId}` : ''}`
    )
    url.searchParams.set('include', 'lines;fixture;league')
    url.searchParams.set('order', 'desc')
    url.searchParams.set('per_page', '15')
    url.searchParams.set('page', String(input.page))
    const response = await requestSportmonks(url, token, pageSchema, fetcher)
    if (response.pagination.current_page !== input.page)
      throw new SportmonksError('invalid_response', 'Sportmonks returned an unexpected news page.')
    result = { articles: response.data, hasMore: response.pagination.has_more, fetchedAt }
  }
  for (const article of result.articles) {
    if (
      article.lines.some((line) => line.newsitem_id !== article.id) ||
      (article.fixture &&
        (article.fixture.id !== article.fixture_id ||
          article.fixture.league_id !== article.league_id)) ||
      (article.league && article.league.id !== article.league_id)
    )
      throw new SportmonksError(
        'invalid_response',
        'Sportmonks returned inconsistent article relationships.'
      )
    if (input.kind === 'fixture' && article.fixture_id !== input.fixtureId)
      throw new SportmonksError('invalid_response', 'Sportmonks returned news for another fixture.')
    if (
      input.kind === 'feed' &&
      (article.type !== (input.feed === 'pre-match' ? 'prematch' : 'postmatch') ||
        (input.seasonId !== undefined && article.fixture?.season_id !== input.seasonId))
    )
      throw new SportmonksError(
        'invalid_response',
        'Sportmonks returned news for another feed or season.'
      )
  }
  return result
}
