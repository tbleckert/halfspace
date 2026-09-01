import { Link } from '@tanstack/react-router'
import { ArrowRight, BriefcaseBusiness } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { CachedTransfer } from '@/data/db'
import { TeamLogo } from '@/features/teams/team-logo'
import { prefetchTeamEntity } from '@/features/teams/use-team'
import {
  formatTransferDate,
  transferLabel,
  transferTimestamp
} from '@/features/transfers/transfer-display'
import { intentPrefetchProps } from '@/lib/prefetch'

export function PlayerCareer({
  competitionId,
  date,
  loading,
  online,
  season,
  transfers
}: {
  competitionId?: number
  date?: string
  loading: boolean
  online: boolean
  season?: number
  transfers: CachedTransfer[] | undefined
}): React.JSX.Element {
  if (transfers === undefined) return <PlayerCareerSkeleton />

  const sortedTransfers = transfers.toSorted(
    (left, right) => transferTimestamp(right.date) - transferTimestamp(left.date)
  )

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold tracking-tight">Career</h2>

      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        {sortedTransfers.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
            <BriefcaseBusiness className="size-6" />
            <p className="text-sm font-medium text-foreground">
              {loading ? 'Loading career…' : 'No transfers'}
            </p>
          </div>
        ) : (
          <ol className="divide-y">
            {sortedTransfers.map((transfer) => (
              <li
                key={transfer.id}
                className="grid gap-3 px-4 py-4 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-5"
              >
                <time
                  className="font-mono text-xs tabular-nums text-muted-foreground"
                  dateTime={transfer.date}
                >
                  {formatTransferDate(transfer.date)}
                </time>

                <div className="flex min-w-0 items-center gap-2.5">
                  <TransferTeam
                    competitionId={competitionId}
                    date={date}
                    online={online}
                    season={season}
                    team={transfer.raw.fromTeam ?? null}
                  />
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                  <TransferTeam
                    competitionId={competitionId}
                    date={date}
                    online={online}
                    season={season}
                    team={transfer.raw.toTeam ?? null}
                  />
                </div>

                <div className="flex items-center gap-2 sm:justify-end">
                  <Badge variant="secondary">{transferLabel(transfer)}</Badge>
                  {!transfer.raw.completed && <Badge variant="outline">Pending</Badge>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}

function TransferTeam({
  competitionId,
  date,
  online,
  season,
  team
}: {
  competitionId?: number
  date?: string
  online: boolean
  season?: number
  team: CachedTransfer['raw']['fromTeam']
}): React.JSX.Element {
  if (!team) {
    return <span className="min-w-0 truncate text-sm text-muted-foreground">Free agent</span>
  }

  return (
    <Link
      to="/teams/$teamId"
      params={{ teamId: String(team.id) }}
      search={{ competition: competitionId, date, season }}
      className="flex min-w-0 items-center gap-2 rounded-sm font-medium outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
      {...intentPrefetchProps(online, () => prefetchTeamEntity(team.id))}
    >
      <TeamLogo
        className="size-8 bg-background"
        imagePath={team.image_path ?? null}
        online={online}
      />
      <span className="truncate text-sm">{team.name}</span>
    </Link>
  )
}

function PlayerCareerSkeleton(): React.JSX.Element {
  return (
    <section className="flex flex-col gap-5">
      <Skeleton className="h-6 w-20" />
      <div className="overflow-hidden rounded-xl border bg-card">
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className="grid gap-3 border-b px-4 py-4 last:border-b-0 sm:grid-cols-[7.5rem_minmax(0,1fr)_5rem] sm:items-center sm:gap-5"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </section>
  )
}
