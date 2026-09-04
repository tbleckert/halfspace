import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, RefreshCw } from 'lucide-react'
import type { NewsFeed, RefreshNewsInput, SportmonksNewsArticle } from '@shared/contracts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorAlert } from '@/components/error-alert'
import { entitySubpageNavigationItemClassName } from '@/components/entity-subpage-navigation-variants'
import { CompetitionLogo } from '@/features/competitions/competition-logo'
import { useNews } from './use-news'
import { newsParagraphs } from './news-data'

export function MatchdayNews({ online }: { online: boolean }): React.JSX.Element {
  const [feed, setFeed] = useState<NewsFeed>('pre-match')
  const input = useMemo<RefreshNewsInput>(() => ({ kind: 'feed', feed, page: 1 }), [feed])
  const news = useNews(input, online)

  return (
    <aside
      aria-label="Matchday news"
      className="flex min-h-0 flex-col border-t bg-sidebar min-[1120px]:sticky min-[1120px]:top-0 min-[1120px]:h-dvh min-[1120px]:border-l min-[1120px]:border-t-0 min-[1120px]:border-l-sidebar-border"
    >
      <div className="flex shrink-0 items-center justify-between px-5 pb-4 pt-6 min-[1120px]:pt-10">
        <h2 className="text-lg font-semibold tracking-tight">News</h2>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Refresh news"
          disabled={!online || news.refreshing}
          onClick={() => void news.refresh()}
        >
          <RefreshCw className="size-3.5" />
        </Button>
      </div>
      <div role="group" aria-label="News type" className="flex shrink-0 gap-5 border-b px-5">
        {(['pre-match', 'post-match'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={feed === value}
            onClick={() => setFeed(value)}
            className={entitySubpageNavigationItemClassName(feed === value)}
          >
            {value === 'pre-match' ? 'Previews' : 'Reports'}
          </button>
        ))}
      </div>
      <div className="min-h-0 min-[1120px]:flex-1 min-[1120px]:overflow-y-auto min-[1120px]:overscroll-contain">
        {news.error && (
          <div className="p-5">
            <ErrorAlert>{news.error}</ErrorAlert>
          </div>
        )}
        {news.cached?.articles.length ? (
          <div className="divide-y divide-border/60">
            {news.cached.articles.slice(0, 8).map((article, index) => (
              <NewsHeadline
                key={article.id}
                article={article}
                online={online}
                featured={index === 0}
              />
            ))}
          </div>
        ) : !news.cached && online && !news.error ? (
          <div aria-label="Loading news" className="divide-y divide-border/60">
            {[0, 1, 2].map((item) => (
              <div key={item} className="space-y-3 px-5 py-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            {news.cached
              ? 'No articles available'
              : online
                ? 'News unavailable'
                : 'News not available offline'}
          </p>
        )}
      </div>
      <div className="shrink-0 border-t p-3">
        <Link
          to="/news"
          search={{ feed }}
          className="flex items-center justify-between rounded-md px-2 py-2 text-sm font-medium outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          All news <ArrowUpRight className="size-4 text-muted-foreground" />
        </Link>
      </div>
    </aside>
  )
}

function NewsHeadline({
  article,
  online,
  featured
}: {
  article: SportmonksNewsArticle
  online: boolean
  featured: boolean
}): React.JSX.Element {
  return (
    <Link
      to="/news/$articleId"
      params={{ articleId: String(article.id) }}
      search={{
        fixture: article.fixture_id,
        competition: article.league_id,
        season: article.fixture?.season_id
      }}
      className="group block px-5 py-5 outline-none hover:bg-sidebar-accent focus-visible:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <div className="mb-2.5 flex items-center gap-2 text-xs text-muted-foreground">
        <CompetitionLogo
          className="size-5 shrink-0"
          imagePath={article.league?.image_path ?? null}
          online={online}
        />
        <span className="truncate">{article.league?.name ?? 'Football'}</span>
      </div>
      <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] group-hover:text-primary">
        {article.title}
      </h3>
      {featured && (
        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
          {newsParagraphs(article)[0]}
        </p>
      )}
      {article.type === 'postmatch' && (
        <p className="mt-2 text-xs text-muted-foreground">AI-written report</p>
      )}
    </Link>
  )
}
