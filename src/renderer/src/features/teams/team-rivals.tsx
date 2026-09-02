import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import type { readTeamRivals } from '@/data/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TeamLogo } from './team-logo'
import { prefetchTeamEntity } from './use-team'
import { intentPrefetchProps } from '@/lib/prefetch'

export function TeamRivals({
  cached,
  loading,
  error,
  online,
  date
}: {
  cached: Awaited<ReturnType<typeof readTeamRivals>> | undefined
  loading: boolean
  error: string | null
  online: boolean
  date: string
}): React.JSX.Element {
  const rivals = [...(cached?.rivals ?? [])].sort((a, b) =>
    (a.team?.name ?? '').localeCompare(b.team?.name ?? '')
  )
  return (
    <Card>
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="text-sm">Rivals</CardTitle>
      </CardHeader>
      {error && (
        <p role="alert" className="px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {rivals.length ? (
        <div className="divide-y">
          {rivals.map(({ id, team }) => (
            <Link
              key={id}
              to="/teams/$teamId"
              params={{ teamId: String(id) }}
              search={{ date, competition: undefined, season: undefined }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              {...intentPrefetchProps(online, () => prefetchTeamEntity(id))}
            >
              <TeamLogo className="size-9" imagePath={team?.imagePath ?? null} online={online} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {team?.name ?? `Team ${id}`}
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      ) : (
        !error && (
          <CardContent className="p-4 text-sm text-muted-foreground">
            {cached === undefined || (loading && !cached)
              ? 'Loading rivals…'
              : !cached && !online
                ? 'Rivals not available offline'
                : 'No rivals reported'}
          </CardContent>
        )
      )}
    </Card>
  )
}
