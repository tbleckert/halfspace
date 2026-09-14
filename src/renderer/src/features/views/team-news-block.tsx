import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import type { ViewBlock } from '@shared/views'
import type { CachedFixture } from '@/data/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTeamFixtures } from '@/features/teams/use-team'
import { useNews } from '@/features/news/use-news'
import { newsParagraphs } from '@/features/news/news-data'
import { useCurrentTime } from '@/lib/use-current-time'
import { BlockPending, BlockError } from './view-block-state'
import { selectTeamViewFixtures, teamViewFixtureInput } from './team-view-data'

export function TeamNewsBlock({
  block,
  online,
  today,
  timeZone
}: {
  block: Extract<ViewBlock, { type: 'team-news' }>
  online: boolean
  today: string
  timeZone: string
}): React.JSX.Element {
  const input = useMemo(
    () => teamViewFixtureInput(block.teamId, today, timeZone),
    [block.teamId, today, timeZone]
  )
  const query = useTeamFixtures(input, online)
  const now = useCurrentTime()
  const fixtures = [
    ...selectTeamViewFixtures(query.cached?.fixtures ?? [], block.teamId, 'upcoming', now).slice(
      0,
      3
    ),
    ...selectTeamViewFixtures(query.cached?.fixtures ?? [], block.teamId, 'recent', now).slice(0, 3)
  ]
  return (
    <div className="space-y-2">
      <BlockError error={query.error} online={online} refresh={query.refresh} />
      {!query.cached?.query ? (
        <BlockPending
          block={block}
          online={online}
          error={query.error}
          loading={query.refreshing || query.cached === undefined}
        />
      ) : (
        <Card className="overflow-hidden bg-accent">
          <CardHeader>
            <CardTitle>Team news</CardTitle>
            <p className="text-xs text-muted-foreground">
              Match previews and reports · Last and next 30 days
            </p>
          </CardHeader>
          <CardContent>
            {!fixtures.length ? (
              <p className="text-sm text-muted-foreground">
                No recent or upcoming matches reported in this window.
              </p>
            ) : (
              <div className="view-news-matches">
                {fixtures.map((fixture) => (
                  <MatchNews
                    key={fixture.id}
                    fixture={fixture}
                    online={online}
                    teamId={block.teamId}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
function MatchNews({
  fixture,
  online,
  teamId
}: {
  fixture: CachedFixture
  online: boolean
  teamId: number
}): React.JSX.Element {
  const input = useMemo(() => ({ kind: 'fixture' as const, fixtureId: fixture.id }), [fixture.id])
  const news = useNews(input, online)
  const articles =
    news.cached?.articles.filter((article) => article.fixture_id === fixture.id) ?? []
  return (
    <section className="min-w-0 space-y-3">
      <Link
        to="/fixtures/$fixtureId"
        params={{ fixtureId: String(fixture.id) }}
        search={{ team: teamId, competition: fixture.leagueId, season: fixture.seasonId }}
        className="block text-xs text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
      >
        {fixture.name ?? fixture.raw.participants?.map((team) => team.name).join(' vs ') ?? 'Match'}
      </Link>
      <BlockError error={news.error} online={online} refresh={news.refresh} />
      {articles.length ? (
        articles.map((article) => (
          <Link
            key={article.id}
            to="/news/$articleId"
            params={{ articleId: String(article.id) }}
            search={{
              fixture: fixture.id,
              competition: fixture.leagueId,
              season: fixture.seasonId
            }}
            className="block rounded-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            <p className="text-xs text-muted-foreground">
              Sportmonks ·{' '}
              {article.type === 'postmatch' ? 'AI-written match report' : 'Match preview'}
            </p>
            <h4 className="mt-1 text-base font-semibold leading-snug wrap-anywhere">
              {article.title}
            </h4>
            <p className="view-news-excerpt mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {newsParagraphs(article)[0]}
            </p>
          </Link>
        ))
      ) : (
        <p role="status" className="text-xs text-muted-foreground">
          {news.cached
            ? 'No articles reported for this match.'
            : news.error
              ? 'News unavailable.'
              : online
                ? 'Loading match news…'
                : 'Match news not cached for offline use.'}
        </p>
      )}
    </section>
  )
}
