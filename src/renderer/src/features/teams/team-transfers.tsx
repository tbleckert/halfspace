import { Link } from '@tanstack/react-router'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Repeat2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { CachedTransfer } from '@/data/db'
import { PlayerPhoto } from '@/features/players/player-photo'
import { prefetchPlayerEntity } from '@/features/players/use-player'
import {
  formatTransferDate,
  transferLabel,
  transferTimestamp
} from '@/features/transfers/transfer-display'
import { intentPrefetchProps } from '@/lib/prefetch'
import { TeamLogo } from './team-logo'
import { prefetchTeamEntity } from './use-team'

export function TeamTransfers({
  competitionId,
  date,
  loading,
  online,
  season,
  teamId,
  transfers
}: {
  competitionId?: number
  date?: string
  loading: boolean
  online: boolean
  season?: number
  teamId: number
  transfers: CachedTransfer[] | undefined
}): React.JSX.Element {
  if (transfers === undefined) return <TeamTransfersSkeleton />

  const sortedTransfers = transfers.toSorted(
    (left, right) => transferTimestamp(right.date) - transferTimestamp(left.date)
  )

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold tracking-tight">Transfers</h2>

      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        {sortedTransfers.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
            <Repeat2 className="size-6" />
            <p className="text-sm font-medium text-foreground">
              {loading ? 'Loading transfers…' : 'No transfers'}
            </p>
          </div>
        ) : (
          <ol className="divide-y">
            {sortedTransfers.map((transfer) => (
              <TeamTransferRow
                key={transfer.id}
                competitionId={competitionId}
                date={date}
                online={online}
                season={season}
                teamId={teamId}
                transfer={transfer}
              />
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}

function TeamTransferRow({
  competitionId,
  date,
  online,
  season,
  teamId,
  transfer
}: {
  competitionId?: number
  date?: string
  online: boolean
  season?: number
  teamId: number
  transfer: CachedTransfer
}): React.JSX.Element {
  const incoming = transfer.toTeamId === teamId && transfer.fromTeamId !== teamId
  const outgoing = transfer.fromTeamId === teamId && transfer.toTeamId !== teamId
  const counterpart = incoming
    ? (transfer.raw.fromTeam ?? null)
    : outgoing
      ? (transfer.raw.toTeam ?? null)
      : null
  const player = transfer.raw.player ?? null

  return (
    <li className="grid gap-3 px-4 py-3.5 sm:grid-cols-[7.5rem_4rem_minmax(0,1fr)_minmax(0,0.85fr)_auto] sm:items-center sm:gap-4">
      <time
        className="font-mono text-xs tabular-nums text-muted-foreground"
        dateTime={transfer.date}
      >
        {formatTransferDate(transfer.date)}
      </time>

      <TransferDirection incoming={incoming} outgoing={outgoing} />

      <Link
        to="/players/$playerId"
        params={{ playerId: String(transfer.playerId) }}
        search={{ competition: competitionId, date, season, team: teamId }}
        className="flex min-w-0 items-center gap-2.5 rounded-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
        {...intentPrefetchProps(online, () => prefetchPlayerEntity(transfer.playerId))}
      >
        <PlayerPhoto
          className="size-9 rounded-full bg-background"
          imagePath={player?.image_path ?? null}
          online={online}
        />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {player?.display_name ?? player?.name ?? `Player ${transfer.playerId}`}
          </span>
          {player?.position?.name && (
            <span className="block truncate text-xs text-muted-foreground">
              {player.position.name}
            </span>
          )}
        </span>
      </Link>

      <CounterpartTeam
        competitionId={competitionId}
        counterpart={counterpart}
        date={date}
        incoming={incoming}
        online={online}
        outgoing={outgoing}
        season={season}
      />

      <div className="flex items-center gap-2 sm:justify-end">
        <Badge variant="secondary">{transferLabel(transfer)}</Badge>
        {!transfer.raw.completed && <Badge variant="outline">Pending</Badge>}
      </div>
    </li>
  )
}

function TransferDirection({
  incoming,
  outgoing
}: {
  incoming: boolean
  outgoing: boolean
}): React.JSX.Element {
  if (incoming) {
    return (
      <span className="flex items-center gap-1 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        <ArrowDownLeft className="size-3.5" />
        IN
      </span>
    )
  }

  if (outgoing) {
    return (
      <span className="flex items-center gap-1 font-mono text-xs font-semibold text-muted-foreground">
        <ArrowUpRight className="size-3.5" />
        OUT
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1 font-mono text-xs font-semibold text-muted-foreground">
      <ArrowRight className="size-3.5" />
      MOVE
    </span>
  )
}

function CounterpartTeam({
  competitionId,
  counterpart,
  date,
  incoming,
  online,
  outgoing,
  season
}: {
  competitionId?: number
  counterpart: CachedTransfer['raw']['fromTeam']
  date?: string
  incoming: boolean
  online: boolean
  outgoing: boolean
  season?: number
}): React.JSX.Element {
  const prefix = incoming ? 'From' : outgoing ? 'To' : 'Between'

  if (!counterpart) {
    return <span className="text-sm text-muted-foreground">{prefix} free agency</span>
  }

  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
      <span className="shrink-0">{prefix}</span>
      <Link
        to="/teams/$teamId"
        params={{ teamId: String(counterpart.id) }}
        search={{ competition: competitionId, date, season }}
        className="flex min-w-0 items-center gap-2 rounded-sm font-medium text-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
        {...intentPrefetchProps(online, () => prefetchTeamEntity(counterpart.id))}
      >
        <TeamLogo
          className="size-7 bg-background"
          imagePath={counterpart.image_path ?? null}
          online={online}
        />
        <span className="truncate">{counterpart.name}</span>
      </Link>
    </div>
  )
}

function TeamTransfersSkeleton(): React.JSX.Element {
  return (
    <section className="flex flex-col gap-5">
      <Skeleton className="h-6 w-24" />
      <div className="overflow-hidden rounded-xl border bg-card">
        {[0, 1, 2, 3, 4].map((row) => (
          <div
            key={row}
            className="grid gap-3 border-b px-4 py-3.5 last:border-b-0 sm:grid-cols-[7.5rem_4rem_minmax(0,1fr)_minmax(0,0.85fr)_5rem] sm:items-center sm:gap-4"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </section>
  )
}
