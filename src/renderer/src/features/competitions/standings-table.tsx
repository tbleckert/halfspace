import { Link } from '@tanstack/react-router'
import type { CachedStanding } from '@/data/db'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { TeamLogo } from '@/features/teams/team-logo'
import { prefetchTeamEntity } from '@/features/teams/use-team'
import { prefetchFixtureEntity } from '@/features/fixtures/use-fixtures'
import { intentPrefetchProps } from '@/lib/prefetch'
import { cn } from '@/lib/utils'
import { recentStandingForm, standingDetailValue } from './standing-details'

const resultLabels: Record<string, string> = { W: 'Win', D: 'Draw', L: 'Loss' }

export function StandingsTable({
  competitionId,
  date,
  name,
  online,
  season,
  standings
}: {
  competitionId: number
  date: string
  name: string
  online: boolean
  season?: number
  standings: CachedStanding[]
}): React.JSX.Element {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="text-sm">{name}</CardTitle>
      </CardHeader>
      <Table className="min-w-80 table-fixed border-collapse" aria-label={name}>
        <TableHeader className="bg-muted/45 text-xs text-muted-foreground [&_tr]:border-0">
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead className="h-auto w-10 px-3 py-2">#</TableHead>
            <TableHead className="h-auto px-2 py-2">Team</TableHead>
            <TableHead className="h-auto w-10 px-2 py-2 text-right" title="Played">
              P
            </TableHead>
            <TableHead className="h-auto w-12 px-2 py-2 text-right" title="Goal difference">
              GD
            </TableHead>
            <TableHead className="h-auto w-12 px-3 py-2 text-right">Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y">
          {standings.map((standing) => {
            const teamName = standing.raw.participant?.name ?? `Team ${standing.participantId}`
            const form = recentStandingForm(standing.raw.form)
            const goalDifference = standingDetailValue(standing.raw.details, 179)
            return (
              <TableRow key={standing.id} className="border-0 hover:bg-transparent">
                <TableCell className="px-3 py-2.5 font-mono tabular-nums text-muted-foreground">
                  {standing.position}
                </TableCell>
                <TableCell className="whitespace-normal px-2 py-2.5">
                  <Link
                    to="/teams/$teamId"
                    params={{ teamId: String(standing.participantId) }}
                    search={{ competition: competitionId, date, season }}
                    className="flex min-w-0 items-center gap-2.5 rounded-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    {...intentPrefetchProps(online, () =>
                      prefetchTeamEntity(standing.participantId)
                    )}
                  >
                    <TeamLogo
                      className="size-7 bg-background"
                      imagePath={standing.raw.participant?.image_path ?? null}
                      online={online}
                    />
                    <span className="truncate font-medium">{teamName}</span>
                  </Link>
                  {form.length > 0 && (
                    <div
                      className="ml-[2.375rem] mt-1.5 flex gap-1"
                      aria-label={`${teamName} recent form, latest on the right`}
                    >
                      {form.map((result) => (
                        <Link
                          key={result.id}
                          to="/fixtures/$fixtureId"
                          params={{ fixtureId: String(result.fixture_id) }}
                          search={{
                            competition: competitionId,
                            date,
                            season: season ?? standing.seasonId
                          }}
                          aria-label={`${teamName}: ${resultLabels[result.form]}, open match`}
                          title={`${resultLabels[result.form]} · Open match`}
                          className={cn(
                            'flex size-5 items-center justify-center rounded-sm font-mono text-[10px] font-semibold outline-none hover:opacity-75 focus-visible:ring-2 focus-visible:ring-ring',
                            result.form === 'W'
                              ? 'bg-success/15 text-success-emphasis'
                              : result.form === 'L'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-muted text-muted-foreground'
                          )}
                          {...intentPrefetchProps(online, () =>
                            prefetchFixtureEntity(result.fixture_id)
                          )}
                        >
                          {result.form}
                        </Link>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="px-2 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                  {standingDetailValue(standing.raw.details, 129) ?? '–'}
                </TableCell>
                <TableCell className="px-2 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                  {goalDifference === null
                    ? '–'
                    : goalDifference > 0
                      ? `+${goalDifference}`
                      : goalDifference}
                </TableCell>
                <TableCell className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums">
                  {standing.raw.points}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}
