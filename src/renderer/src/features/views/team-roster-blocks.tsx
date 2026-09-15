import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import type { ViewBlock } from '@shared/views'
import type { CachedTransfer, SquadMember } from '@/data/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { PlayerPhoto } from '@/features/players/player-photo'
import { useTeamSquad, useTeamTransfers } from '@/features/teams/use-team'
import { useCompetitionDetail } from '@/features/competitions/use-competition-detail'
import { useCompetitionSeasons } from '@/features/competitions/use-competition-workspace'
import { formatTransferDate, transferLabel } from '@/features/transfers/transfer-display'
import { BlockError, BlockPending } from './view-block-state'
import { recentViewTransfers } from './team-roster-data'

type SquadBlock = Extract<ViewBlock, { type: 'team-squad' }>
type TransfersBlock = Extract<ViewBlock, { type: 'team-transfers' }>

export function TeamSquadBlock({
  block,
  online
}: {
  block: SquadBlock
  online: boolean
}): React.JSX.Element {
  const competition = useCompetitionDetail(block.competitionId, online)
  const seasons = useCompetitionSeasons(block.competitionId, online)
  const season =
    seasons.cached?.seasons.find((season) => season.id === block.seasonId) ??
    (competition.cached?.competition?.raw.currentseason?.id === block.seasonId
      ? competition.cached.competition.raw.currentseason
      : undefined)
  const query = useTeamSquad(block.teamId, online, block.seasonId)
  const members = (query.cached?.members ?? [])
    .filter((member) => member.entry.teamId === block.teamId)
    .toSorted(
      (left, right) =>
        (left.entry.positionId ?? Infinity) - (right.entry.positionId ?? Infinity) ||
        left.player.displayName.localeCompare(right.player.displayName)
    )
  return (
    <div className="space-y-2">
      <BlockError error={query.error} online={online} refresh={query.refresh} />
      <BlockError
        error={seasons.error ?? competition.error}
        online={online}
        refresh={async () => {
          await Promise.all([seasons.refresh(), competition.refresh()])
        }}
      />
      {!query.cached?.query ? (
        <BlockPending
          block={block}
          online={online}
          error={query.error}
          loading={query.refreshing || query.cached === undefined}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Team squad</CardTitle>
            <p className="text-xs text-muted-foreground">
              {competition.cached?.competition?.name ?? `Competition ${block.competitionId}`} ·{' '}
              {season?.name ?? `Season ${block.seasonId}`}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {members.length ? (
              <ul className="grid grid-cols-1 gap-6 @min-[520px]/view-widget:grid-cols-2 @min-[860px]/view-widget:grid-cols-3">
                {members.slice(0, 12).map((member) => (
                  <SquadPlayer
                    key={member.entry.id}
                    member={member}
                    block={block}
                    online={online}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No squad reported for this team and season.
              </p>
            )}
            <Link
              to="/teams/$teamId/squad"
              params={{ teamId: String(block.teamId) }}
              search={{ competition: block.competitionId, season: block.seasonId }}
              className="inline-block text-xs text-primary hover:underline"
            >
              {members.length > 12
                ? `View all ${members.length} reported players`
                : 'Open team squad'}
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SquadPlayer({
  member,
  block,
  online
}: {
  member: SquadMember
  block: SquadBlock
  online: boolean
}): React.JSX.Element {
  return (
    <li className="min-w-0">
      <Link
        to="/players/$playerId"
        params={{ playerId: String(member.player.id) }}
        search={{ team: block.teamId, competition: block.competitionId, season: block.seasonId }}
        className="flex min-w-0 items-center gap-3 rounded-md p-1 hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <PlayerPhoto
          className="size-10 shrink-0 bg-background"
          imagePath={member.player.imagePath}
          online={online}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium wrap-anywhere">{member.player.displayName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {member.entry.detailedPositionName ??
              member.entry.positionName ??
              'Position not reported'}
          </p>
        </div>
        <span
          className="font-mono text-sm tabular-nums text-muted-foreground"
          aria-label={`Shirt number ${member.entry.jerseyNumber ?? 'not reported'}`}
        >
          {member.entry.jerseyNumber ?? '—'}
        </span>
      </Link>
    </li>
  )
}

export function TeamTransfersBlock({
  block,
  online,
  today,
  onChange
}: {
  block: TransfersBlock
  online: boolean
  today: string
  onChange: (block: TransfersBlock) => void
}): React.JSX.Element {
  const input = useMemo(() => ({ teamId: block.teamId }), [block.teamId])
  const query = useTeamTransfers(input, online)
  const transfers = recentViewTransfers(
    query.cached?.transfers ?? [],
    block.teamId,
    block.direction,
    today
  )
  const directionOptions = [
    { value: 'all', label: 'All moves' },
    { value: 'incoming', label: 'Incoming' },
    { value: 'outgoing', label: 'Outgoing' }
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
        <Card>
          <CardHeader>
            <CardTitle>Team transfers</CardTitle>
            <p className="text-xs text-muted-foreground">Completed moves · Last 365 days</p>
            <Select
              items={directionOptions}
              value={String(block.direction)}
              onValueChange={(value) => {
                if (value === null) return
                onChange({ ...block, direction: value as TransfersBlock['direction'] })
              }}
            >
              <SelectTrigger aria-label="Transfer direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {directionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-4">
            {transfers.length ? (
              <ul className="grid grid-cols-1 gap-6 @min-[520px]/view-widget:grid-cols-2 @min-[860px]/view-widget:grid-cols-3">
                {transfers.slice(0, 6).map((transfer) => (
                  <TransferRow
                    key={transfer.id}
                    transfer={transfer}
                    teamId={block.teamId}
                    date={today}
                    online={online}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No completed {block.direction === 'all' ? '' : `${block.direction} `}transfers
                reported in this window.
              </p>
            )}
            <Link
              to="/teams/$teamId/transfers"
              params={{ teamId: String(block.teamId) }}
              search={{ date: today }}
              className="inline-block text-xs text-primary hover:underline"
            >
              {transfers.length > 6
                ? `Showing 6 of ${transfers.length} · View transfer history`
                : 'View transfer history'}
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TransferRow({
  transfer,
  teamId,
  date,
  online
}: {
  transfer: CachedTransfer
  teamId: number
  date: string
  online: boolean
}): React.JSX.Element {
  const incoming = transfer.toTeamId === teamId
  const otherId = incoming ? transfer.fromTeamId : transfer.toTeamId
  const other = incoming ? transfer.raw.fromTeam : transfer.raw.toTeam
  return (
    <li className="min-w-0 space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span
          className={`font-mono ${incoming ? 'text-success-foreground' : 'text-muted-foreground'}`}
        >
          {incoming ? 'IN' : 'OUT'}
        </span>
        <time className="font-mono tabular-nums text-muted-foreground" dateTime={transfer.date}>
          {formatTransferDate(transfer.date)}
        </time>
      </div>
      <Link
        to="/players/$playerId"
        params={{ playerId: String(transfer.playerId) }}
        search={{ team: teamId, date, competition: undefined, season: undefined }}
        className="flex items-center gap-2 rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <PlayerPhoto
          className="size-9 shrink-0 bg-background"
          imagePath={transfer.raw.player?.image_path ?? null}
          online={online}
        />
        <span className="text-sm font-medium wrap-anywhere">
          {transfer.raw.player?.display_name ??
            transfer.raw.player?.name ??
            `Player ${transfer.playerId}`}
        </span>
      </Link>
      <p className="text-xs text-muted-foreground wrap-anywhere">
        {incoming ? 'From' : 'To'}{' '}
        {otherId ? (
          <Link
            to="/teams/$teamId"
            params={{ teamId: String(otherId) }}
            search={{ date }}
            className="hover:text-primary"
          >
            {other?.name ?? `Team ${otherId}`}
          </Link>
        ) : (
          'club not reported'
        )}{' '}
        · {transferLabel(transfer)}
      </p>
    </li>
  )
}
