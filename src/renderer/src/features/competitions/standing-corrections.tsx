import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { StandingCorrectionsQuery } from '@/data/season-resources-cache'
import { TeamLogo } from '@/features/teams/team-logo'

export function StandingCorrections({
  cached,
  seasonId,
  competitionId,
  date,
  online,
  loading
}: {
  cached: StandingCorrectionsQuery | null | undefined
  seasonId: number | null
  competitionId: number
  date: string
  online: boolean
  loading: boolean
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Standings adjustments</CardTitle>
      </CardHeader>
      {!cached?.corrections.length ? (
        <CardContent className="text-sm text-muted-foreground">
          {cached
            ? 'No adjustments reported for this season'
            : loading || cached === undefined
              ? 'Loading adjustments…'
              : online
                ? 'Adjustments unavailable'
                : 'Adjustments not available offline'}
        </CardContent>
      ) : (
        <div className="divide-y">
          {cached.corrections.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                {row.participant_type === 'team' ? (
                  <Link
                    to="/teams/$teamId"
                    params={{ teamId: String(row.participant_id) }}
                    search={{ competition: competitionId, season: seasonId ?? undefined, date }}
                    className="flex items-center gap-2 text-sm font-medium hover:text-primary"
                  >
                    <TeamLogo
                      className="size-6"
                      imagePath={row.participant?.image_path ?? null}
                      online={online}
                    />
                    {row.participant?.name ?? 'Team'}
                  </Link>
                ) : (
                  <p className="text-sm font-medium">Unknown participant</p>
                )}
                {(row.stage?.name || row.group?.name) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[row.stage?.name, row.group?.name].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span>
                  <span className="font-mono tabular-nums">
                    {row.calc_type === '-' ? '−' : row.calc_type === '+' ? '+' : ''}
                    {row.value}
                  </span>{' '}
                  points
                  {row.calc_type !== '+' && row.calc_type !== '-' && (
                    <span className="ml-2 text-xs text-muted-foreground">Direction unreported</span>
                  )}
                </span>
                <Badge variant="outline">{row.active ? 'Active' : 'Inactive'}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
