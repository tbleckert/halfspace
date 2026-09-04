import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/data/db'
import type { RefreshNewsInput } from '@shared/contracts'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorAlert } from '@/components/error-alert'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useOnline } from '@/lib/use-online'
import { newsParagraphs } from './news-data'
import { useNews } from './use-news'

export function NewsArticlePage({
  articleId,
  fixture: fixtureId,
  competition,
  season
}: {
  articleId: string
  fixture?: number
  competition?: number
  season?: number
}): React.JSX.Element {
  const online = useOnline()
  const id = Number(articleId)
  const article = useScopedLiveQuery(
    async () =>
      Number.isSafeInteger(id) && id > 0 ? ((await db.newsArticles.get(id)) ?? null) : null,
    [id]
  )
  const resolvedFixture = article?.fixture_id ?? fixtureId
  const input = useMemo<RefreshNewsInput>(
    () => ({ kind: 'fixture', fixtureId: resolvedFixture ?? 0 }),
    [resolvedFixture]
  )
  const news = useNews(input, online && !!resolvedFixture)
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-7 lg:p-10">
      <Link
        to="/news"
        search={{
          competition: article?.league_id ?? competition,
          season,
          feed: article?.type === 'postmatch' ? 'post-match' : 'pre-match'
        }}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        News
      </Link>
      {news.error && <ErrorAlert>{news.error}</ErrorAlert>}
      {article ? (
        <article>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">{article.title}</h1>
          <div className="my-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <Link
              to="/competitions/$competitionId"
              params={{ competitionId: String(article.league_id) }}
              search={{ season: article.fixture?.season_id ?? season }}
              className="hover:text-primary"
            >
              {article.league?.name ?? 'Competition'}
            </Link>
            <span>
              {article.type === 'postmatch' ? 'AI-written match report' : 'Match preview'}
            </span>
            <Link
              to="/fixtures/$fixtureId"
              params={{ fixtureId: String(article.fixture_id) }}
              search={{
                competition: article.league_id,
                season: article.fixture?.season_id ?? season
              }}
              className="ml-auto font-medium text-primary"
            >
              View match
            </Link>
          </div>
          <Card>
            <CardContent className="space-y-5 p-6 text-[15px] leading-7">
              {newsParagraphs(article).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              {!article.lines.length && (
                <p className="text-muted-foreground">Article text unavailable</p>
              )}
            </CardContent>
          </Card>
        </article>
      ) : (
        <p className="text-sm text-muted-foreground">
          {article === undefined ||
          (online && !news.error && news.cached === undefined && !!resolvedFixture)
            ? 'Loading article…'
            : !online
              ? 'Article not available offline'
              : 'Article unavailable'}
        </p>
      )}
    </div>
  )
}
