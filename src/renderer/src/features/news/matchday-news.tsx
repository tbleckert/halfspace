import { Link } from '@tanstack/react-router'
import { ArrowUpRight, RefreshCw } from 'lucide-react'
import type { RefreshNewsInput, SportmonksNewsArticle } from '@shared/contracts'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorAlert } from '@/components/error-alert'
import { CompetitionLogo } from '@/features/competitions/competition-logo'
import { MatchdayCard } from '@/features/fixtures/matchday-card'
import { useNews } from './use-news'
import { newsParagraphs, sortNewsByMatchDate } from './news-data'

const previewsInput: RefreshNewsInput = { kind: 'feed', feed: 'pre-match', page: 1 }
const reportsInput: RefreshNewsInput = { kind: 'feed', feed: 'post-match', page: 1 }

export function MatchdayNews({ online }: { online: boolean }): React.JSX.Element {
  const previews = useNews(previewsInput, online)
  const reports = useNews(reportsInput, online)
  const feeds = [previews, reports]
  const articles = sortNewsByMatchDate([
    ...(previews.cached?.articles ?? []),
    ...(reports.cached?.articles ?? [])
  ])
  const loading = feeds.some(
    ({ cached, error }) => cached === undefined || (!cached && online && !error)
  )

  return (
    <aside
      aria-label="Matchday news"
      className="flex min-h-0 flex-col bg-sidebar min-[1120px]:sticky min-[1120px]:top-0 min-[1120px]:h-[calc(100dvh-var(--workspace-top-inset,0px))]"
    >
      <div className="min-h-0 space-y-3 px-4 pb-4 pt-3 min-[1120px]:flex-1 min-[1120px]:overflow-y-auto min-[1120px]:overscroll-contain">
        {previews.error && <ErrorAlert>Previews: {previews.error}</ErrorAlert>}
        {reports.error && <ErrorAlert>Reports: {reports.error}</ErrorAlert>}
        {articles.length ? (
          articles.map((article, index) => (
            <NewsHeadline
              key={article.id}
              article={article}
              index={index}
              online={online}
              featured={index === 0}
            />
          ))
        ) : loading ? (
          <div aria-label="Loading news" className="space-y-3">
            {[0, 1, 2].map((item) => (
              <Card key={item} className="space-y-3 bg-accent p-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </Card>
            ))}
          </div>
        ) : (
          <p className="py-6 text-sm text-muted-foreground">
            {feeds.every(({ cached }) => cached)
              ? 'No articles available'
              : online
                ? 'News unavailable'
                : 'News not available offline'}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 px-4 pb-3 pt-2">
        <Link
          to="/news"
          search={{}}
          className="flex flex-1 items-center justify-between rounded-md px-2 py-2 text-sm font-medium outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          All news <ArrowUpRight className="size-4 text-muted-foreground" />
        </Link>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Refresh news"
          disabled={!online || feeds.some(({ refreshing }) => refreshing)}
          onClick={() => void Promise.all([previews.refresh(), reports.refresh()])}
        >
          <RefreshCw className="size-3.5" />
        </Button>
      </div>
    </aside>
  )
}

function NewsHeadline({
  article,
  index,
  online,
  featured
}: {
  article: SportmonksNewsArticle
  index: number
  online: boolean
  featured: boolean
}): React.JSX.Element {
  return (
    <MatchdayCard index={index} className="overflow-hidden bg-accent">
      <Link
        to="/news/$articleId"
        params={{ articleId: String(article.id) }}
        search={{
          fixture: article.fixture_id,
          competition: article.league_id,
          season: article.fixture?.season_id
        }}
        className="group block p-4 outline-none hover:bg-sidebar-accent focus-visible:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
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
        {article.fixture?.starting_at && (
          <p className="mt-2 text-xs text-muted-foreground">
            Match date · {article.fixture.starting_at.slice(0, 10)}
          </p>
        )}
      </Link>
    </MatchdayCard>
  )
}
