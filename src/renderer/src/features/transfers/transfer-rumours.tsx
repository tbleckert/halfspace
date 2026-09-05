import { rumourSourceUrl, rumourAmount } from './rumour-display'
import { Link } from '@tanstack/react-router'
import { ArrowRight, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import type { SportmonksTransferRumour } from '@shared/transfer-rumours'
import type { readTransferRumours } from '@/data/transfer-rumours-cache'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PlayerPhoto } from '@/features/players/player-photo'
import { prefetchPlayerEntity } from '@/features/players/use-player'
import { intentPrefetchProps } from '@/lib/prefetch'
import { formatTransferDate } from './transfer-display'
import { TransferTeam } from './transfer-team'

export function TransferRumours({
  cached,
  loading,
  online,
  page,
  onPageChange,
  competitionId,
  season,
  date,
  teamId
}: {
  cached: Awaited<ReturnType<typeof readTransferRumours>> | undefined
  loading: boolean
  online: boolean
  page: number
  onPageChange: (page: number) => void
  competitionId?: number
  season?: number
  date?: string
  teamId?: number
}): React.JSX.Element {
  return (
    <section aria-label="Transfer rumours" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Rumours</h2>
          <p className="mt-1 text-xs text-muted-foreground">Latest updated · Unconfirmed reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous rumour page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Page <span className="font-mono tabular-nums">{page}</span>
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next rumour page"
            disabled={!cached?.hasMore}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      {!cached?.rumours.length ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {cached
              ? 'No rumours on this page'
              : cached === undefined || loading
                ? 'Loading rumours…'
                : online
                  ? 'Rumours unavailable'
                  : 'Rumours not available offline'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cached.rumours.map((rumour) => (
            <RumourRow
              key={rumour.id}
              rumour={rumour}
              online={online}
              competitionId={competitionId}
              season={season}
              date={date}
              teamId={teamId}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function RumourRow({
  rumour,
  online,
  competitionId,
  season,
  date,
  teamId
}: {
  rumour: SportmonksTransferRumour
  online: boolean
  competitionId?: number
  season?: number
  date?: string
  teamId?: number
}): React.JSX.Element {
  const source = rumourSourceUrl(rumour.source_url)
  const amount = rumourAmount(rumour)
  const context = { competitionId, season, date, online }
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Link
            to="/players/$playerId"
            params={{ playerId: String(rumour.player_id) }}
            search={{ competition: competitionId, season, date, team: undefined }}
            className="flex items-center gap-3 hover:text-primary"
            {...intentPrefetchProps(online, () => prefetchPlayerEntity(rumour.player_id))}
          >
            <PlayerPhoto
              className="size-10 rounded-full"
              imagePath={rumour.player?.image_path ?? null}
              online={online}
            />
            <span className="text-sm font-semibold">{rumour.player?.display_name ?? 'Player'}</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {teamId && (
              <Badge variant="outline">
                {rumour.to_team_id === teamId ? 'Linked arrival' : 'Linked departure'}
              </Badge>
            )}
            {rumour.probability && (
              <Badge variant="outline">Likelihood: {rumour.probability}</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TransferTeam teamId={rumour.from_team_id} team={rumour.fromTeam} {...context} />
          <ArrowRight aria-label="To" className="size-4 shrink-0 text-muted-foreground" />
          <TransferTeam teamId={rumour.to_team_id} team={rumour.toTeam} {...context} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {rumour.date && (
            <time className="font-mono tabular-nums" dateTime={rumour.date}>
              {formatTransferDate(rumour.date)}
            </time>
          )}
          {rumour.type?.name && <span>{rumour.type.name}</span>}
          {amount && (
            <span>
              Reported fee <span className="font-mono tabular-nums">{amount}</span>
            </span>
          )}
          {source ? (
            <a
              href={source}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              {rumour.source_name ?? 'Source'}
              <ExternalLink className="size-3" />
            </a>
          ) : (
            rumour.source_name && <span>{rumour.source_name}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
