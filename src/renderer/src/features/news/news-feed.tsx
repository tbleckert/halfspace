import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import type { RefreshNewsInput, NewsFeed, SportmonksNewsArticle } from '@shared/contracts'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ErrorAlert } from '@/components/error-alert'
import { CompetitionLogo } from '@/features/competitions/competition-logo'
import { useNews } from './use-news'
import { newsParagraphs } from './news-data'

export function NewsFeedView({
  feed: feedType,
  page,
  seasonId,
  online,
  onFeedChange,
  onPageChange
}: {
  feed: NewsFeed
  page: number
  seasonId?: number
  online: boolean
  onFeedChange: (feed: NewsFeed) => void
  onPageChange: (page: number) => void
}): React.JSX.Element {
  const input = useMemo<Extract<RefreshNewsInput, { kind: 'feed' }>>(
    () => ({ kind: 'feed', feed: feedType, page, seasonId }),
    [feedType, page, seasonId]
  )
  const feed = useNews(input, online)
  return (
    <section className="flex flex-col gap-4" aria-label="News feed">
      <div className="flex items-center justify-between gap-3">
        <NativeSelect
          aria-label="News type"
          value={input.feed}
          onChange={(event) => onFeedChange(event.target.value as NewsFeed)}
        >
          <NativeSelectOption value="pre-match">Previews</NativeSelectOption>
          <NativeSelectOption value="post-match">Match reports</NativeSelectOption>
        </NativeSelect>
        <Button
          variant="outline"
          size="icon"
          aria-label="Refresh news"
          disabled={!online || feed.refreshing}
          onClick={() => void feed.refresh()}
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>
      {feed.error && <ErrorAlert>{feed.error}</ErrorAlert>}
      {feed.cached?.articles.length ? (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {feed.cached.articles.map((article) => (
            <NewsArticleCard key={article.id} article={article} online={online} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {feed.cached
              ? 'No articles on this page'
              : feed.error
                ? 'News unavailable'
                : !online
                  ? 'News not available offline'
                  : 'Loading news…'}
          </CardContent>
        </Card>
      )}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={input.page <= 1}
          onClick={() => onPageChange(input.page - 1)}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Page <span className="font-mono tabular-nums">{input.page}</span>
        </span>
        <Button
          variant="outline"
          disabled={!feed.cached?.hasMore}
          onClick={() => onPageChange(input.page + 1)}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </section>
  )
}

export function NewsArticleCard({
  article,
  online
}: {
  article: SportmonksNewsArticle
  online: boolean
}): React.JSX.Element {
  return (
    <Card className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CompetitionLogo
          className="size-6"
          imagePath={article.league?.image_path ?? null}
          online={online}
        />
        <Link
          to="/competitions/$competitionId"
          params={{ competitionId: String(article.league_id) }}
          search={{ season: article.fixture?.season_id }}
          className="hover:text-primary"
        >
          {article.league?.name ?? 'Competition'}
        </Link>
        <span className="ml-auto">
          {article.type === 'postmatch' ? 'Report · AI-written' : 'Preview'}
        </span>
      </div>
      <Link
        to="/news/$articleId"
        params={{ articleId: String(article.id) }}
        search={{
          fixture: article.fixture_id,
          competition: article.league_id,
          season: article.fixture?.season_id
        }}
        className="group block"
      >
        <h2 className="text-lg font-semibold leading-snug group-hover:text-primary">
          {article.title}
        </h2>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {newsParagraphs(article)[0]}
        </p>
      </Link>
      {article.fixture?.starting_at && (
        <p className="mt-auto pt-1 text-xs text-muted-foreground">
          Match date · {article.fixture.starting_at.slice(0, 10)}
        </p>
      )}
    </Card>
  )
}
