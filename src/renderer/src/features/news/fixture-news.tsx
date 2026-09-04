import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import type { RefreshNewsInput, SportmonksFixture } from '@shared/contracts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ErrorAlert } from '@/components/error-alert'
import { useNews } from './use-news'

export function FixtureNews({
  fixture,
  online
}: {
  fixture: SportmonksFixture
  online: boolean
}): React.JSX.Element | null {
  const input = useMemo<RefreshNewsInput>(
    () => ({ kind: 'fixture', fixtureId: fixture.id }),
    [fixture.id]
  )
  const news = useNews(input, online)
  if (news.cached && !news.cached.articles.length && !news.error) return null
  if (!online && !news.cached) return null
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle>News</CardTitle>
      </CardHeader>
      {news.error && (
        <CardContent className="p-4">
          <ErrorAlert>{news.error}</ErrorAlert>
        </CardContent>
      )}
      {!news.cached && !news.error && (
        <CardContent className="p-4 text-sm text-muted-foreground">Loading news…</CardContent>
      )}
      <div className="divide-y">
        {news.cached?.articles.map((article) => (
          <Link
            key={article.id}
            to="/news/$articleId"
            params={{ articleId: String(article.id) }}
            search={{
              fixture: fixture.id,
              competition: fixture.league_id,
              season: fixture.season_id
            }}
            className="block px-4 py-3 hover:bg-sidebar-accent"
          >
            <p className="font-medium leading-snug">{article.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {article.type === 'postmatch' ? 'AI-written match report' : 'Match preview'}
            </p>
          </Link>
        ))}
      </div>
    </Card>
  )
}
