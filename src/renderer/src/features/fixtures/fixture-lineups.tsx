import { Card } from '@/components/ui/card'
import { PlayerPhoto } from '@/features/players/player-photo'
import { prefetchPlayerEntity } from '@/features/players/use-player'
import { TeamLogo } from '@/features/teams/team-logo'
import { intentPrefetchProps } from '@/lib/prefetch'
import { cn } from '@/lib/utils'
import type { SportmonksEvent, SportmonksLineup, SportmonksParticipant } from '@shared/contracts'
import { Link } from '@tanstack/react-router'
import { ArrowLeftRight, CircleX } from 'lucide-react'
import {
  fixtureFormationLabel,
  fixtureFormationLines,
  fixturePlayerAnnotations,
  formatPlayerRating,
  lineupPlayerRating,
  type PlayerEventAnnotation
} from './fixture-detail-data'
import { FixtureEmptyState } from './fixture-empty-state'
import type { FixturePlayerContext } from './fixture-route'

export function FixtureLineups({
  away,
  context,
  events,
  home,
  lineups,
  online
}: {
  away?: SportmonksParticipant
  context: FixturePlayerContext
  events: SportmonksEvent[]
  home?: SportmonksParticipant
  lineups: SportmonksLineup[]
  online: boolean
}): React.JSX.Element {
  const homeEntries = lineups.filter(({ team_id }) => team_id === home?.id)
  const awayEntries = lineups.filter(({ team_id }) => team_id === away?.id)
  const homeFormation = fixtureFormationLines(homeEntries)
  const awayFormation = fixtureFormationLines(awayEntries)
  const annotations = fixturePlayerAnnotations(events)
  const homeSubstitutes = lineupGroup(homeEntries, 12)
  const awaySubstitutes = lineupGroup(awayEntries, 12)

  if (lineups.length === 0) {
    return (
      <Card className="overflow-hidden">
        <FixtureEmptyState>Lineups not available</FixtureEmptyState>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 divide-x border-b bg-muted/25">
          <LineupTeamHeader formation={homeFormation} online={online} team={home} />
          <LineupTeamHeader align="right" formation={awayFormation} online={online} team={away} />
        </div>

        {homeFormation && awayFormation ? (
          <CombinedFormationPitch
            annotations={annotations}
            context={context}
            awayFormation={awayFormation}
            awayTeamId={away?.id}
            homeFormation={homeFormation}
            homeTeamId={home?.id}
            online={online}
          />
        ) : (
          <div className="grid divide-y lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <LineupGroup
              annotations={annotations}
              context={context}
              entries={lineupGroup(homeEntries, 11)}
              label="Starting XI"
              online={online}
              teamId={home?.id}
            />
            <LineupGroup
              annotations={annotations}
              context={context}
              entries={lineupGroup(awayEntries, 11)}
              label="Starting XI"
              online={online}
              teamId={away?.id}
            />
          </div>
        )}
      </Card>

      {(homeSubstitutes.length > 0 || awaySubstitutes.length > 0) && (
        <section>
          <h2 className="mb-3 text-xl font-semibold tracking-tight">Bench</h2>
          <Card className="grid overflow-hidden lg:grid-cols-2 lg:divide-x">
            <TeamBench
              annotations={annotations}
              context={context}
              entries={homeSubstitutes}
              online={online}
              team={home}
            />
            <TeamBench
              annotations={annotations}
              context={context}
              entries={awaySubstitutes}
              online={online}
              team={away}
            />
          </Card>
        </section>
      )}
    </div>
  )
}

type Formation = NonNullable<ReturnType<typeof fixtureFormationLines>>

function LineupTeamHeader({
  align = 'left',
  formation,
  online,
  team
}: {
  align?: 'left' | 'right'
  formation: Formation | null
  online: boolean
  team?: SportmonksParticipant
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-3 px-4 py-3',
        align === 'right' && 'flex-row-reverse text-right'
      )}
    >
      <TeamLogo
        className="size-9 bg-background"
        imagePath={team?.image_path ?? null}
        online={online}
      />
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold">{team?.name ?? 'Team'}</h2>
        {formation && (
          <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
            {fixtureFormationLabel(formation)}
          </p>
        )}
      </div>
    </div>
  )
}

function CombinedFormationPitch({
  annotations,
  awayFormation,
  awayTeamId,
  context,
  homeFormation,
  homeTeamId,
  online
}: {
  annotations: Map<number, PlayerEventAnnotation[]>
  awayFormation: Formation
  awayTeamId?: number
  context: FixturePlayerContext
  homeFormation: Formation
  homeTeamId?: number
  online: boolean
}): React.JSX.Element {
  return (
    <div className="p-3 sm:p-4">
      <div
        aria-label={`Starting lineups, ${fixtureFormationLabel(homeFormation)} and ${fixtureFormationLabel(awayFormation)}`}
        className="relative mx-auto aspect-[16/9] w-full overflow-hidden rounded-lg bg-pitch shadow-inner"
        role="group"
      >
        <PitchMarkings />
        <div className="absolute inset-0 z-10 grid grid-cols-2">
          <FormationSide
            annotations={annotations}
            context={context}
            formation={homeFormation}
            online={online}
            side="home"
            teamId={homeTeamId}
          />
          <FormationSide
            annotations={annotations}
            context={context}
            formation={awayFormation}
            online={online}
            side="away"
            teamId={awayTeamId}
          />
        </div>
      </div>
    </div>
  )
}

function FormationSide({
  annotations,
  context,
  formation,
  online,
  side,
  teamId
}: {
  annotations: Map<number, PlayerEventAnnotation[]>
  context: FixturePlayerContext
  formation: Formation
  online: boolean
  side: 'home' | 'away'
  teamId?: number
}): React.JSX.Element {
  const lines = side === 'home' ? formation : formation.toReversed()

  return (
    <div
      className={cn('grid h-full py-4 sm:py-6', side === 'home' ? 'pl-4 pr-1' : 'pl-1 pr-4')}
      style={{ gridTemplateColumns: `repeat(${lines.length}, minmax(0, 1fr))` }}
    >
      {lines.map((line) => {
        const entries = side === 'home' ? line.entries.toReversed() : line.entries

        return (
          <div key={line.row} className="flex min-w-0 flex-col items-center justify-around gap-1">
            {entries.map((entry) => (
              <FormationPlayer
                key={entry.id}
                annotations={annotations.get(entry.player_id) ?? []}
                context={context}
                entry={entry}
                online={online}
                teamId={teamId}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function PitchMarkings(): React.JSX.Element {
  return (
    <div aria-hidden="true" className="absolute inset-3 text-pitch-foreground/45">
      <div className="absolute inset-0 border border-current" />
      <div className="absolute inset-y-0 left-1/2 border-l border-current" />
      <div className="absolute left-1/2 top-1/2 size-[20%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-current" />
      <div className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
      <div className="absolute left-0 top-1/2 h-1/2 w-[18%] -translate-y-1/2 border border-l-0 border-current" />
      <div className="absolute left-0 top-1/2 h-1/4 w-[8%] -translate-y-1/2 border border-l-0 border-current" />
      <div className="absolute left-[12%] top-1/2 size-1 -translate-y-1/2 rounded-full bg-current" />
      <div className="absolute right-0 top-1/2 h-1/2 w-[18%] -translate-y-1/2 border border-r-0 border-current" />
      <div className="absolute right-0 top-1/2 h-1/4 w-[8%] -translate-y-1/2 border border-r-0 border-current" />
      <div className="absolute right-[12%] top-1/2 size-1 -translate-y-1/2 rounded-full bg-current" />
    </div>
  )
}

function FormationPlayer({
  annotations,
  context,
  entry,
  online,
  teamId
}: {
  annotations: PlayerEventAnnotation[]
  context: FixturePlayerContext
  entry: SportmonksLineup
  online: boolean
  teamId?: number
}): React.JSX.Element {
  const name = entry.player_name.trim()
  const rating = lineupPlayerRating(entry)

  return (
    <Link
      aria-label={lineupPlayerLabel(entry, annotations)}
      to="/players/$playerId"
      params={{ playerId: String(entry.player_id) }}
      search={{ ...context, team: teamId }}
      className="group flex w-full min-w-0 max-w-24 flex-col items-center rounded-md p-1 text-center outline-none focus-visible:ring-2 focus-visible:ring-pitch-foreground/90"
      {...intentPrefetchProps(online, () => prefetchPlayerEntity(entry.player_id))}
    >
      <span className="relative">
        <PlayerPhoto
          className="size-10 rounded-full bg-portrait text-portrait-foreground shadow-sm sm:size-11"
          imagePath={entry.player?.image_path ?? null}
          online={online}
        />
        <PlayerEventBadges annotations={annotations} />
        <PlayerRatingBadge rating={rating} />
        {entry.jersey_number !== null && (
          <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-shirt font-mono text-[10px] font-semibold tabular-nums text-shirt-foreground ring-1 ring-pitch-foreground/80">
            {entry.jersey_number}
          </span>
        )}
      </span>
      <span className="mt-1.5 max-w-full truncate rounded bg-overlay/45 px-1.5 py-0.5 text-[10px] font-medium text-pitch-foreground shadow-sm sm:text-xs">
        {name}
      </span>
    </Link>
  )
}

function TeamBench({
  annotations,
  context,
  entries,
  online,
  team
}: {
  annotations: Map<number, PlayerEventAnnotation[]>
  context: FixturePlayerContext
  entries: SportmonksLineup[]
  online: boolean
  team?: SportmonksParticipant
}): React.JSX.Element {
  return (
    <div className="min-w-0 border-b last:border-b-0 lg:border-b-0">
      <div className="flex items-center gap-2 border-b bg-muted/25 px-4 py-3">
        <TeamLogo
          className="size-7 bg-background"
          imagePath={team?.image_path ?? null}
          online={online}
        />
        <h3 className="truncate text-sm font-semibold">{team?.name ?? 'Team'}</h3>
      </div>
      {entries.length === 0 ? (
        <div className="flex min-h-28 items-center justify-center text-sm text-muted-foreground">
          Not available
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-x-2 gap-y-4 p-4 sm:grid-cols-4 xl:grid-cols-5">
          {entries.map((entry) => (
            <BenchPlayer
              key={entry.id}
              annotations={annotations.get(entry.player_id) ?? []}
              context={context}
              entry={entry}
              online={online}
              teamId={team?.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BenchPlayer({
  annotations,
  context,
  entry,
  online,
  teamId
}: {
  annotations: PlayerEventAnnotation[]
  context: FixturePlayerContext
  entry: SportmonksLineup
  online: boolean
  teamId?: number
}): React.JSX.Element {
  const rating = lineupPlayerRating(entry)

  return (
    <Link
      aria-label={lineupPlayerLabel(entry, annotations)}
      to="/players/$playerId"
      params={{ playerId: String(entry.player_id) }}
      search={{ ...context, team: teamId }}
      className="group flex min-w-0 flex-col items-center rounded-md p-1 text-center outline-none hover:bg-muted/45 focus-visible:bg-muted/45"
      {...intentPrefetchProps(online, () => prefetchPlayerEntity(entry.player_id))}
    >
      <span className="relative">
        <PlayerPhoto
          className="size-10 rounded-full bg-portrait text-portrait-foreground shadow-xs sm:size-11"
          imagePath={entry.player?.image_path ?? null}
          online={online}
        />
        <PlayerEventBadges annotations={annotations} />
        <PlayerRatingBadge rating={rating} />
      </span>
      <span className="mt-1.5 flex max-w-full items-baseline gap-1 text-xs">
        <span className="font-mono font-medium tabular-nums text-muted-foreground">
          {entry.jersey_number ?? '–'}
        </span>
        <span className="truncate font-medium">{entry.player_name}</span>
      </span>
    </Link>
  )
}

function LineupGroup({
  annotations,
  context,
  entries,
  label,
  online,
  teamId
}: {
  annotations: Map<number, PlayerEventAnnotation[]>
  context: FixturePlayerContext
  entries: SportmonksLineup[]
  label: string
  online: boolean
  teamId?: number
}): React.JSX.Element | null {
  if (entries.length === 0) return null

  return (
    <div>
      <h4 className="px-4 pb-1 pt-3 text-xs font-medium text-muted-foreground">{label}</h4>
      <div className="pb-2">
        {entries.map((entry) => {
          const playerAnnotations = annotations.get(entry.player_id) ?? []

          return (
            <Link
              key={entry.id}
              aria-label={lineupPlayerLabel(entry, playerAnnotations)}
              to="/players/$playerId"
              params={{ playerId: String(entry.player_id) }}
              search={{ ...context, team: teamId }}
              className="grid grid-cols-[2rem_2rem_minmax(0,1fr)_2.5rem] items-center gap-2 px-4 py-2 text-sm outline-none hover:bg-muted/45 focus-visible:bg-muted/45"
              {...intentPrefetchProps(online, () => prefetchPlayerEntity(entry.player_id))}
            >
              <span className="text-center font-mono font-medium tabular-nums text-muted-foreground">
                {entry.jersey_number ?? '–'}
              </span>
              <span className="relative">
                <PlayerPhoto
                  className="size-8 rounded-full bg-portrait text-portrait-foreground shadow-xs"
                  imagePath={entry.player?.image_path ?? null}
                  online={online}
                />
                <PlayerEventBadges annotations={playerAnnotations} />
              </span>
              <span className="truncate font-medium">{entry.player_name}</span>
              <PlayerRatingValue rating={lineupPlayerRating(entry)} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function PlayerRatingBadge({ rating }: { rating: number | null }): React.JSX.Element | null {
  if (rating === null) return null

  return (
    <span
      className="absolute -bottom-1 -left-2 rounded-full bg-portrait px-1.5 py-0.5 font-mono text-[9px] font-semibold tabular-nums text-shirt shadow-xs"
      title={`Rating ${formatPlayerRating(rating)}`}
    >
      {formatPlayerRating(rating)}
    </span>
  )
}

function PlayerRatingValue({ rating }: { rating: number | null }): React.JSX.Element {
  return (
    <span className="text-right font-mono text-xs font-semibold tabular-nums text-muted-foreground">
      {rating === null ? '–' : formatPlayerRating(rating)}
    </span>
  )
}

function PlayerEventBadges({
  annotations
}: {
  annotations: PlayerEventAnnotation[]
}): React.JSX.Element | null {
  if (annotations.length === 0) return null

  const visibleAnnotations = annotations.slice(0, 4)

  return (
    <span aria-hidden="true" className="absolute -right-2 -top-2 flex -space-x-1">
      {visibleAnnotations.map((annotation) => (
        <PlayerEventBadge
          key={`${annotation.eventId}-${annotation.kind}`}
          annotation={annotation}
        />
      ))}
      {annotations.length > visibleAnnotations.length && (
        <span className="grid size-5 place-items-center rounded-full bg-background font-mono text-[9px] font-semibold text-foreground shadow-xs ring-1 ring-border">
          +{annotations.length - visibleAnnotations.length}
        </span>
      )}
    </span>
  )
}

function PlayerEventBadge({
  annotation
}: {
  annotation: PlayerEventAnnotation
}): React.JSX.Element {
  const title = `${annotation.label} ${formatPlayerAnnotationMinute(annotation)}`

  if (annotation.kind === 'yellow-card' || annotation.kind === 'red-card') {
    return (
      <span
        className={cn(
          'mt-0.5 h-4 w-2.5 rounded-[2px] shadow-xs ring-1 ring-overlay/10',
          annotation.kind === 'yellow-card' ? 'bg-brand-yellow' : 'bg-destructive'
        )}
        title={title}
      />
    )
  }

  return (
    <span
      className="grid size-5 place-items-center rounded-full bg-background text-foreground shadow-xs ring-1 ring-border"
      title={title}
    >
      {annotation.kind === 'goal' && <FootballIcon />}
      {annotation.kind === 'assist' && <span className="text-[9px] font-bold">A</span>}
      {(annotation.kind === 'substitution-on' || annotation.kind === 'substitution-off') && (
        <ArrowLeftRight className="size-3" strokeWidth={2.25} />
      )}
      {annotation.kind === 'missed-penalty' && <CircleX className="size-3" strokeWidth={2.25} />}
    </span>
  )
}

function FootballIcon(): React.JSX.Element {
  return (
    <svg className="size-3.5" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.25" />
      <path d="m8 4.25 2.5 1.8-.95 2.95h-3.1L5.5 6.05 8 4.25Z" fill="currentColor" />
      <path
        d="m5.5 6.05-2.7-.2M6.45 9l-1.6 2.25M9.55 9l1.6 2.25m-.65-5.2 2.7-.2M8 4.25V1.75"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  )
}

function lineupPlayerLabel(entry: SportmonksLineup, annotations: PlayerEventAnnotation[]): string {
  const rating = lineupPlayerRating(entry)

  return [
    entry.jersey_number ?? 'No number',
    entry.player_name.trim(),
    rating === null ? null : `Rating ${formatPlayerRating(rating)}`,
    ...annotations.map(
      (annotation) => `${annotation.label} ${formatPlayerAnnotationMinute(annotation)}`
    )
  ]
    .filter(Boolean)
    .join(', ')
}

function formatPlayerAnnotationMinute(annotation: PlayerEventAnnotation): string {
  return annotation.extraMinute
    ? `${annotation.minute}+${annotation.extraMinute}′`
    : `${annotation.minute}′`
}

function lineupGroup(entries: SportmonksLineup[], typeId: number): SportmonksLineup[] {
  return entries
    .filter(({ type_id }) => type_id === typeId)
    .toSorted(
      (left, right) =>
        (left.formation_position ?? Number.MAX_SAFE_INTEGER) -
          (right.formation_position ?? Number.MAX_SAFE_INTEGER) ||
        (left.jersey_number ?? Number.MAX_SAFE_INTEGER) -
          (right.jersey_number ?? Number.MAX_SAFE_INTEGER)
    )
}
