import { Card } from '@/components/ui/card'
import { PlayerPhoto } from '@/features/players/player-photo'
import { TeamLogo } from '@/features/teams/team-logo'
import { cn } from '@/lib/utils'
import type { SportmonksEvent, SportmonksParticipant } from '@shared/contracts'
import { sortedFixtureEvents } from './fixture-detail-data'
import { FixtureEmptyState } from './fixture-empty-state'

export function FixtureTimeline({
  away,
  events,
  home,
  online
}: {
  away?: SportmonksParticipant
  events: SportmonksEvent[]
  home?: SportmonksParticipant
  online: boolean
}): React.JSX.Element {
  const sortedEvents = sortedFixtureEvents(events)

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[1fr_4rem_1fr] items-center border-b bg-muted/25 px-4 py-3 text-sm font-semibold">
        <FixtureTimelineTeam participant={home} online={online} align="right" />
        <span />
        <FixtureTimelineTeam participant={away} online={online} align="left" />
      </div>
      {sortedEvents.length === 0 ? (
        <FixtureEmptyState>Timeline not available</FixtureEmptyState>
      ) : (
        <div className="divide-y">
          {sortedEvents.map((event) => {
            const homeEvent = event.participant_id === home?.id
            const content = (
              <FixtureEventContent
                align={homeEvent ? 'right' : 'left'}
                event={event}
                online={online}
              />
            )

            return (
              <div
                key={event.id}
                className="grid min-h-16 grid-cols-[1fr_4rem_1fr] items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 text-right">{homeEvent && content}</div>
                <span className="text-center font-mono text-sm font-semibold tabular-nums">
                  {formatEventMinute(event)}
                </span>
                <div className="min-w-0">{!homeEvent && content}</div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function FixtureTimelineTeam({
  align,
  online,
  participant
}: {
  align: 'left' | 'right'
  online: boolean
  participant?: SportmonksParticipant
}): React.JSX.Element {
  return (
    <div className={cn('flex min-w-0 items-center gap-2', align === 'right' && 'flex-row-reverse')}>
      <TeamLogo
        className="size-7 bg-background"
        imagePath={participant?.image_path ?? null}
        online={online}
      />
      <span className="truncate">{participant?.name ?? 'Team'}</span>
    </div>
  )
}

function FixtureEventContent({
  align,
  event,
  online
}: {
  align: 'left' | 'right'
  event: SportmonksEvent
  online: boolean
}): React.JSX.Element {
  return (
    <div
      className={cn('flex min-w-0 items-center gap-2.5', align === 'right' && 'flex-row-reverse')}
    >
      <PlayerPhoto
        className="size-9 rounded-full bg-muted"
        imagePath={event.player?.image_path ?? null}
        online={online}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {event.player?.display_name ?? event.player_name ?? event.type?.name ?? 'Event'}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {[event.type?.name, event.result, event.info].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>
  )
}

function formatEventMinute(event: SportmonksEvent): string {
  return event.extra_minute ? `${event.minute}+${event.extra_minute}′` : `${event.minute}′`
}
