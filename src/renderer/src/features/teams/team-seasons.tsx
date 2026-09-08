import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { groupTeamSeasons } from './team-seasons-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorAlert } from '@/components/error-alert'
import { RefreshCw } from 'lucide-react'
import { CompetitionLogo } from '@/features/competitions/competition-logo'
import { seasonFixtureDate } from '@/features/competitions/competition-workspace-data'
import { useTeamSeasons } from './use-team-seasons'
import { cn } from '@/lib/utils'

export function TeamSeasons({
  teamId,
  online,
  date
}: {
  teamId: number
  online: boolean
  date: string
}): React.JSX.Element {
  const input = useMemo(() => ({ teamId }), [teamId])
  const { cached, refreshing, error, refresh } = useTeamSeasons(input, online)
  const groups = useMemo(() => groupTeamSeasons(cached?.seasons ?? []), [cached?.seasons])
  return (
    <section className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Seasons</h2>
        <Button
          aria-label="Refresh team seasons"
          size="icon"
          variant="ghost"
          disabled={!online || refreshing}
          onClick={() => void refresh()}
        >
          <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
        </Button>
      </header>
      {error && <ErrorAlert>{error}</ErrorAlert>}
      {groups.map((group) => (
        <Card key={group.competitionId}>
          <CardHeader>
            <CardTitle>
              <Link
                className="inline-flex items-center gap-3 hover:text-primary"
                to="/competitions/$competitionId"
                params={{ competitionId: String(group.competitionId) }}
                search={{
                  season: group.seasons[0].id,
                  date: seasonFixtureDate(group.seasons[0], date)
                }}
              >
                <CompetitionLogo imagePath={group.imagePath} online={online} className="size-8" />
                {group.name}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {group.seasons.map((season) => (
              <Link
                key={season.id}
                to="/competitions/$competitionId"
                params={{ competitionId: String(group.competitionId) }}
                search={{ season: season.id, date: seasonFixtureDate(season, date) }}
                className="rounded-md bg-background px-3 py-2 font-mono text-sm tabular-nums outline-none hover:bg-sidebar-accent hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`${group.name} ${season.name}`}
              >
                {season.name}
              </Link>
            ))}
          </CardContent>
        </Card>
      ))}
      {!groups.length && !error && (
        <p className="py-6 text-sm text-muted-foreground">
          {cached === undefined || (!cached && refreshing)
            ? 'Loading seasons…'
            : !cached && !online
              ? 'Season history isn’t cached yet.'
              : 'No seasons reported.'}
        </p>
      )}
    </section>
  )
}
