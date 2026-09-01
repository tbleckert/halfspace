import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowLeftRight, CircleX, RefreshCw } from 'lucide-react'
import type {
  SportmonksEvent,
  SportmonksFixture,
  SportmonksLineup,
  SportmonksOdd,
  SportmonksParticipant
} from '@shared/contracts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EntitySubpageNavigation } from '@/components/entity-subpage-navigation'
import { entitySubpageNavigationItemClassName } from '@/components/entity-subpage-navigation-variants'
import { ErrorAlert } from '@/components/error-alert'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { CachedCompetition, CachedFixture } from '@/data/db'
import { CompetitionLogo } from '@/features/competitions/competition-logo'
import { prefetchCompetitionWorkspace } from '@/features/competitions/use-competition-workspace'
import { PlayerPhoto } from '@/features/players/player-photo'
import { prefetchPlayerEntity } from '@/features/players/use-player'
import { TeamLogo } from '@/features/teams/team-logo'
import { prefetchTeamEntity } from '@/features/teams/use-team'
import { VenueCard } from '@/features/venues/venue-card'
import { currentTimeZone } from '@/lib/date'
import { isFixtureLive } from '@/lib/fixture-state'
import { currentFixtureScore, fixtureParticipantAt } from '@/lib/fixture'
import { useOnline } from '@/lib/use-online'
import { intentPrefetchProps } from '@/lib/prefetch'
import { cn } from '@/lib/utils'
import {
  fixtureFormationLabel,
  fixtureFormationLines,
  fixtureOddsGroups,
  fixturePlayerAnnotations,
  fixtureStatisticRows,
  fixtureStatisticShare,
  type PlayerEventAnnotation,
  sortedFixtureEvents
} from './fixture-detail-data'
import { FixtureLiveIndicator } from './fixture-live-indicator'
import { FixturePreviewWorkspace } from './fixture-preview'
import type { FixtureDetailSearch } from './fixture-route'
import { prefetchFixturePreview, type FixturePreviewInput } from './use-fixture-preview'
import { useFixtureEntity, useFixtureOdds } from './use-fixtures'

export type FixtureView = 'preview' | 'timeline' | 'lineups' | 'stats' | 'odds'

interface FixtureDetailPageProps {
  competitionId?: number
  date?: string
  fixtureId: string
  seasonId?: number
  teamId?: number
  view: FixtureView
}

export function FixtureDetailPage({
  competitionId,
  date,
  fixtureId,
  seasonId,
  teamId,
  view
}: FixtureDetailPageProps): React.JSX.Element {
  const parsedFixtureId = Number(fixtureId)
  const validFixtureId = Number.isSafeInteger(parsedFixtureId) && parsedFixtureId > 0
  const online = useOnline()
  const fixture = useFixtureEntity(validFixtureId ? parsedFixtureId : null, online)
  const odds = useFixtureOdds(
    validFixtureId && view === 'odds' ? parsedFixtureId : null,
    online && view === 'odds'
  )

  if (!validFixtureId) {
    return (
      <MissingFixture
        competitionId={competitionId}
        date={date}
        seasonId={seasonId}
        teamId={teamId}
      />
    )
  }

  if (fixture.cached === undefined || (!fixture.cached.fixture && online && !fixture.error)) {
    return <FixturePageSkeleton />
  }

  if (!fixture.cached.fixture) {
    return (
      <MissingFixture
        competitionId={competitionId}
        date={date}
        seasonId={seasonId}
        message={
          online ? (fixture.error ?? 'Fixture not found.') : 'Fixture not available offline.'
        }
        teamId={teamId}
      />
    )
  }

  const cachedFixture = fixture.cached.fixture
  const resolvedSeasonId = seasonId ?? cachedFixture.seasonId
  const match = cachedFixture.raw
  const home = fixtureParticipantAt(match, 'home')
  const away = fixtureParticipantAt(match, 'away')
  const heading = `${home?.name ?? 'Home'} vs ${away?.name ?? 'Away'}`
  const teamParticipant = match.participants.find(({ id }) => id === teamId)
  const refreshing = fixture.refreshing || odds.refreshing

  async function refresh(): Promise<void> {
    await Promise.all([fixture.refresh(), view === 'odds' ? odds.refresh() : Promise.resolve()])
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 p-7 lg:p-10">
      <div>
        <FixtureBackLink
          competitionId={competitionId}
          competitionName={match.league?.name ?? fixture.cached.competition?.name}
          date={date}
          seasonId={resolvedSeasonId}
          teamId={teamId}
          teamName={teamParticipant?.name}
        />

        <header className="flex items-center justify-between gap-5">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-semibold tracking-tight">{heading}</h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {[
                match.league?.name ?? fixture.cached.competition?.name,
                formatFixtureDate(cachedFixture.startingAt)
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>

          <Button
            aria-label={`Refresh ${heading}`}
            disabled={!online || refreshing}
            size="icon"
            variant="outline"
            onClick={() => void refresh()}
          >
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
          </Button>
        </header>
      </div>

      {fixture.error && <ErrorAlert>{fixture.error}</ErrorAlert>}
      {odds.error && <ErrorAlert>{odds.error}</ErrorAlert>}

      <MatchScore
        competitionId={competitionId ?? cachedFixture.leagueId}
        context={{ competition: competitionId, date, season: resolvedSeasonId, team: teamId }}
        fixture={match}
        fixtureId={parsedFixtureId}
        online={online}
        startingAt={cachedFixture.startingAt}
        view={view}
      />

      {view === 'preview' && (
        <FixturePreview
          cachedFixture={cachedFixture}
          competition={fixture.cached.competition}
          competitionId={competitionId ?? cachedFixture.leagueId}
          context={{ competition: competitionId, date, season: resolvedSeasonId, team: teamId }}
          date={date}
          online={online}
          seasonId={resolvedSeasonId}
          teamId={teamId}
        />
      )}
      {view === 'timeline' && (
        <FixtureTimeline away={away} events={match.events ?? []} home={home} online={online} />
      )}
      {view === 'lineups' && (
        <FixtureLineups
          away={away}
          context={{
            competition: competitionId ?? cachedFixture.leagueId,
            date,
            season: resolvedSeasonId
          }}
          events={match.events ?? []}
          home={home}
          lineups={match.lineups ?? []}
          online={online}
        />
      )}
      {view === 'stats' && (
        <FixtureStats away={away} home={home} online={online} statistics={match.statistics ?? []} />
      )}
      {view === 'odds' && (
        <FixtureOdds
          hasOdds={cachedFixture.hasOdds}
          loading={odds.cached === undefined || (odds.refreshing && odds.cached.odds.length === 0)}
          odds={(odds.cached?.odds ?? []).map(({ raw }) => raw)}
          offline={!online && odds.cached?.query === null}
        />
      )}
    </div>
  )
}

function MatchScore({
  competitionId,
  context,
  fixture,
  fixtureId,
  online,
  startingAt,
  view
}: {
  competitionId: number
  context: FixtureDetailSearch
  fixture: SportmonksFixture
  fixtureId: number
  online: boolean
  startingAt: number | null
  view: FixtureView
}): React.JSX.Element {
  const home = fixtureParticipantAt(fixture, 'home')
  const away = fixtureParticipantAt(fixture, 'away')
  const { home: homeScore, away: awayScore } = currentFixtureScore(fixture)
  const hasScore = homeScore !== undefined || awayScore !== undefined
  const live = isFixtureLive(fixture.state_id)
  const previewInput = createFixturePreviewInput(
    fixtureId,
    fixture,
    startingAt,
    context.season ?? fixture.season_id
  )

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-8 sm:gap-8 sm:px-10 sm:py-10">
        <FixtureTeam
          competitionId={competitionId}
          context={context}
          online={online}
          participant={home}
        />

        <div className="flex min-w-20 flex-col items-center gap-2 text-center sm:min-w-32">
          {hasScore ? (
            <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums sm:text-5xl">
              {homeScore ?? '–'} <span className="text-muted-foreground">–</span> {awayScore ?? '–'}
            </p>
          ) : (
            <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
              {formatFixtureTime(startingAt)}
            </p>
          )}
          {live ? (
            <FixtureLiveIndicator className="rounded-full bg-success-muted px-2.5 py-1 dark:bg-success-muted-dark/30" />
          ) : (
            <Badge className="font-mono" variant="secondary">
              {fixture.state?.name ?? 'Scheduled'}
            </Badge>
          )}
        </div>

        <FixtureTeam
          competitionId={competitionId}
          context={context}
          online={online}
          participant={away}
        />
      </div>
      <FixtureNavigation
        context={context}
        fixtureId={fixtureId}
        online={online}
        previewInput={previewInput}
        view={view}
      />
    </section>
  )
}

function FixtureTeam({
  competitionId,
  context,
  online,
  participant
}: {
  competitionId: number
  context: FixtureDetailSearch
  online: boolean
  participant?: SportmonksParticipant
}): React.JSX.Element {
  if (!participant) {
    return <p className="text-center text-sm font-medium text-muted-foreground">Team unavailable</p>
  }

  return (
    <Link
      to="/teams/$teamId"
      params={{ teamId: String(participant.id) }}
      search={{ competition: competitionId, date: context.date, season: context.season }}
      className="group flex min-w-0 flex-col items-center gap-3 rounded-lg text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
      {...intentPrefetchProps(online, () => prefetchTeamEntity(participant.id))}
    >
      <TeamLogo
        className="size-16 rounded-xl bg-background shadow-xs sm:size-24"
        imagePath={participant.image_path ?? null}
        online={online}
      />
      <span className="max-w-full truncate text-sm font-semibold group-hover:text-primary sm:text-lg">
        {participant.name}
      </span>
    </Link>
  )
}

function FixtureNavigation({
  context,
  fixtureId,
  online,
  previewInput,
  view
}: {
  context: FixtureDetailSearch
  fixtureId: number
  online: boolean
  previewInput: FixturePreviewInput | null
  view: FixtureView
}): React.JSX.Element {
  const items: Array<{ label: string; to: string; view: FixtureView }> = [
    { label: 'Preview', to: '/fixtures/$fixtureId', view: 'preview' },
    { label: 'Timeline', to: '/fixtures/$fixtureId/timeline', view: 'timeline' },
    { label: 'Lineups', to: '/fixtures/$fixtureId/lineups', view: 'lineups' },
    { label: 'Stats', to: '/fixtures/$fixtureId/stats', view: 'stats' },
    { label: 'Odds', to: '/fixtures/$fixtureId/odds', view: 'odds' }
  ]
  return (
    <EntitySubpageNavigation
      aria-label="Fixture"
      className="overflow-x-auto border-t px-4 sm:justify-center"
    >
      {items.map((item) => (
        <Link
          key={item.view}
          aria-current={view === item.view ? 'page' : undefined}
          to={item.to}
          params={{ fixtureId: String(fixtureId) }}
          search={context}
          className={entitySubpageNavigationItemClassName(view === item.view, 'top', 'pb-4 pt-3')}
          {...(item.view === 'preview' && previewInput
            ? intentPrefetchProps(online, () => prefetchFixturePreview(previewInput))
            : {})}
        >
          {item.label}
        </Link>
      ))}
    </EntitySubpageNavigation>
  )
}

function FixturePreview({
  cachedFixture,
  competition,
  competitionId,
  context,
  date,
  online,
  seasonId,
  teamId
}: {
  cachedFixture: CachedFixture
  competition: CachedCompetition | null
  competitionId: number
  context: FixtureDetailSearch
  date?: string
  online: boolean
  seasonId?: number
  teamId?: number
}): React.JSX.Element {
  const previewInput = useMemo(
    () =>
      createFixturePreviewInput(
        cachedFixture.id,
        cachedFixture.raw,
        cachedFixture.startingAt,
        seasonId ?? cachedFixture.seasonId
      ),
    [cachedFixture, seasonId]
  )

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <FixturePreviewWorkspace
        context={context}
        fixture={cachedFixture}
        input={previewInput}
        online={online}
      />
      <aside className="order-first flex flex-col gap-5 lg:order-last">
        <FixtureDetails
          competition={competition}
          competitionId={competitionId}
          date={date}
          fixture={cachedFixture.raw}
          online={online}
          seasonId={seasonId}
          startingAt={cachedFixture.startingAt}
        />
        {cachedFixture.raw.venue && cachedFixture.raw.venue_id && (
          <VenueCard
            competitionId={competitionId}
            countryName={cachedFixture.raw.venue.country?.name}
            online={online}
            teamId={teamId}
            venueId={cachedFixture.raw.venue_id}
            venueSummary={cachedFixture.raw.venue}
          />
        )}
      </aside>
    </div>
  )
}

function FixtureTimeline({
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
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
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
    </section>
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

function FixtureLineups({
  away,
  context,
  events,
  home,
  lineups,
  online
}: {
  away?: SportmonksParticipant
  context: LineupContext
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
      <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <FixtureEmptyState>Lineups not available</FixtureEmptyState>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
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
      </section>

      {(homeSubstitutes.length > 0 || awaySubstitutes.length > 0) && (
        <section>
          <h2 className="mb-3 text-xl font-semibold tracking-tight">Bench</h2>
          <div className="grid overflow-hidden rounded-xl border bg-card shadow-xs lg:grid-cols-2 lg:divide-x">
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
          </div>
        </section>
      )}
    </div>
  )
}

type LineupContext = {
  competition: number | undefined
  date: string | undefined
  season: number | undefined
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
  context: LineupContext
  homeFormation: Formation
  homeTeamId?: number
  online: boolean
}): React.JSX.Element {
  return (
    <div className="p-3 sm:p-4">
      <div
        aria-label={`Starting lineups, ${fixtureFormationLabel(homeFormation)} and ${fixtureFormationLabel(awayFormation)}`}
        className="relative mx-auto aspect-[16/9] w-full overflow-hidden rounded-lg bg-[#246044] shadow-inner"
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
  context: LineupContext
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
    <div aria-hidden="true" className="absolute inset-3 text-white/45">
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
  context: LineupContext
  entry: SportmonksLineup
  online: boolean
  teamId?: number
}): React.JSX.Element {
  const name = entry.player_name.trim()

  return (
    <Link
      aria-label={lineupPlayerLabel(entry, annotations)}
      to="/players/$playerId"
      params={{ playerId: String(entry.player_id) }}
      search={{ ...context, team: teamId }}
      className="group flex w-full min-w-0 max-w-24 flex-col items-center rounded-md p-1 text-center outline-none focus-visible:ring-2 focus-visible:ring-white/90"
      {...intentPrefetchProps(online, () => prefetchPlayerEntity(entry.player_id))}
    >
      <span className="relative">
        <PlayerPhoto
          className="size-10 rounded-full bg-[#fffdfa] text-slate-500 shadow-sm sm:size-11"
          imagePath={entry.player?.image_path ?? null}
          online={online}
        />
        <PlayerEventBadges annotations={annotations} />
        {entry.jersey_number !== null && (
          <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-[#071f4f] font-mono text-[10px] font-semibold tabular-nums text-white ring-1 ring-white/80">
            {entry.jersey_number}
          </span>
        )}
      </span>
      <span className="mt-1.5 max-w-full truncate rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm sm:text-xs">
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
  context: LineupContext
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
  context: LineupContext
  entry: SportmonksLineup
  online: boolean
  teamId?: number
}): React.JSX.Element {
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
          className="size-10 rounded-full bg-[#fffdfa] text-slate-500 shadow-xs sm:size-11"
          imagePath={entry.player?.image_path ?? null}
          online={online}
        />
        <PlayerEventBadges annotations={annotations} />
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
  context: LineupContext
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
              className="grid grid-cols-[2rem_2rem_minmax(0,1fr)] items-center gap-2 px-4 py-2 text-sm outline-none hover:bg-muted/45 focus-visible:bg-muted/45"
              {...intentPrefetchProps(online, () => prefetchPlayerEntity(entry.player_id))}
            >
              <span className="text-center font-mono font-medium tabular-nums text-muted-foreground">
                {entry.jersey_number ?? '–'}
              </span>
              <span className="relative">
                <PlayerPhoto
                  className="size-8 rounded-full bg-[#fffdfa] text-slate-500 shadow-xs"
                  imagePath={entry.player?.image_path ?? null}
                  online={online}
                />
                <PlayerEventBadges annotations={playerAnnotations} />
              </span>
              <span className="truncate font-medium">{entry.player_name}</span>
            </Link>
          )
        })}
      </div>
    </div>
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
          'mt-0.5 h-4 w-2.5 rounded-[2px] shadow-xs ring-1 ring-black/10',
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
  return [
    entry.jersey_number ?? 'No number',
    entry.player_name.trim(),
    ...annotations.map(
      (annotation) => `${annotation.label} ${formatPlayerAnnotationMinute(annotation)}`
    )
  ].join(', ')
}

function formatPlayerAnnotationMinute(annotation: PlayerEventAnnotation): string {
  return annotation.extraMinute
    ? `${annotation.minute}+${annotation.extraMinute}′`
    : `${annotation.minute}′`
}

function FixtureStats({
  away,
  home,
  online,
  statistics
}: {
  away?: SportmonksParticipant
  home?: SportmonksParticipant
  online: boolean
  statistics: NonNullable<SportmonksFixture['statistics']>
}): React.JSX.Element {
  const rows = fixtureStatisticRows(statistics)

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="grid grid-cols-[1fr_minmax(8rem,1.5fr)_1fr] items-center border-b bg-muted/25 px-4 py-3">
        <FixtureStatTeam participant={home} online={online} align="left" />
        <span />
        <FixtureStatTeam participant={away} online={online} align="right" />
      </div>
      {rows.length === 0 ? (
        <FixtureEmptyState>Stats not available</FixtureEmptyState>
      ) : (
        <div className="divide-y">
          {rows.map((row) => {
            const share = fixtureStatisticShare(row.home, row.away)

            return (
              <div key={row.id} className="px-4 py-4 text-sm">
                <div className="grid grid-cols-[1fr_minmax(8rem,1.5fr)_1fr] items-center gap-4">
                  <span className="font-mono font-semibold tabular-nums">
                    {formatStatisticValue(row.home)}
                  </span>
                  <span className="text-center text-muted-foreground">{row.label}</span>
                  <span className="text-right font-mono font-semibold tabular-nums">
                    {formatStatisticValue(row.away)}
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-muted"
                >
                  {share && (
                    <>
                      <span className="bg-chart-1" style={{ width: `${share.home}%` }} />
                      <span className="bg-chart-5" style={{ width: `${share.away}%` }} />
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function FixtureStatTeam({
  align,
  online,
  participant
}: {
  align: 'left' | 'right'
  online: boolean
  participant?: SportmonksParticipant
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2 text-sm font-semibold',
        align === 'right' && 'flex-row-reverse text-right'
      )}
    >
      <TeamLogo
        className="size-7 bg-background"
        imagePath={participant?.image_path ?? null}
        online={online}
      />
      <span className="truncate">{participant?.name ?? 'Team'}</span>
    </div>
  )
}

function FixtureOdds({
  hasOdds,
  loading,
  odds,
  offline
}: {
  hasOdds: boolean
  loading: boolean
  odds: SportmonksOdd[]
  offline: boolean
}): React.JSX.Element {
  const groups = fixtureOddsGroups(odds)

  if (groups.length === 0) {
    return (
      <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <FixtureEmptyState>
          {loading
            ? 'Loading odds…'
            : offline
              ? 'Odds not available offline'
              : hasOdds
                ? 'Odds not available'
                : 'No odds for this fixture'}
        </FixtureEmptyState>
      </section>
    )
  }

  return (
    <div className="grid items-start gap-5 md:grid-cols-2">
      {groups.map((group) => (
        <section key={group.key} className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">{group.market}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{group.bookmaker}</p>
          </div>
          <div className="divide-y">
            {group.odds.map((odd) => (
              <div
                key={odd.id}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <span className="truncate">{formatOddLabel(odd)}</span>
                <span className="font-mono font-semibold tabular-nums">{odd.value}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function FixtureEmptyState({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-h-36 items-center justify-center px-4 text-sm text-muted-foreground">
      {children}
    </div>
  )
}

function FixtureDetails({
  competition,
  competitionId,
  date,
  fixture,
  online,
  seasonId,
  startingAt
}: {
  competition: CachedCompetition | null
  competitionId: number
  date?: string
  fixture: SportmonksFixture
  online: boolean
  seasonId?: number
  startingAt: number | null
}): React.JSX.Element {
  const competitionName = fixture.league?.name ?? competition?.name ?? `League ${competitionId}`

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Details</h2>
      </div>
      <dl className="divide-y text-sm">
        <div className="px-4 py-3.5">
          <dt className="mb-2 text-xs text-muted-foreground">Competition</dt>
          <dd>
            <Link
              to="/competitions/$competitionId"
              params={{ competitionId: String(competitionId) }}
              search={{ date, season: seasonId }}
              className="flex items-center gap-2 font-medium hover:text-primary"
              {...intentPrefetchProps(online, () => prefetchCompetitionWorkspace(competitionId))}
            >
              <CompetitionLogo
                className="size-7 bg-background"
                imagePath={competition?.imagePath ?? null}
                online={online}
              />
              <span className="truncate">{competitionName}</span>
            </Link>
          </dd>
        </div>
        {startingAt !== null && (
          <Detail label="Kickoff" value={formatFixtureDate(startingAt) ?? ''} mono />
        )}
        {fixture.stage?.name && <Detail label="Stage" value={fixture.stage.name} />}
        {fixture.round?.name && <Detail label="Round" value={fixture.round.name} />}
      </dl>
    </section>
  )
}

function Detail({
  label,
  mono = false,
  value
}: {
  label: string
  mono?: boolean
  value: string
}): React.JSX.Element {
  return (
    <div className="px-4 py-3.5">
      <dt className="mb-1 text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('font-medium', mono && 'font-mono tabular-nums')}>{value}</dd>
    </div>
  )
}

function FixtureBackLink({
  competitionId,
  competitionName,
  date,
  seasonId,
  teamId,
  teamName
}: {
  competitionId?: number
  competitionName?: string
  date?: string
  seasonId?: number
  teamId?: number
  teamName?: string
}): React.JSX.Element {
  const className =
    'mb-5 flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground'

  if (teamId) {
    return (
      <Link
        to="/teams/$teamId"
        params={{ teamId: String(teamId) }}
        search={{ competition: competitionId, date, season: seasonId }}
        className={className}
      >
        <ArrowLeft className="size-4" />
        {teamName ?? 'Team'}
      </Link>
    )
  }

  if (competitionId) {
    return (
      <Link
        to="/competitions/$competitionId"
        params={{ competitionId: String(competitionId) }}
        search={{ date, season: seasonId }}
        className={className}
      >
        <ArrowLeft className="size-4" />
        {competitionName ?? 'Competition'}
      </Link>
    )
  }

  return (
    <Link to="/" search={{ date }} className={className}>
      <ArrowLeft className="size-4" />
      Matchday
    </Link>
  )
}

function MissingFixture({
  competitionId,
  date,
  message = 'Fixture not found.',
  seasonId,
  teamId
}: {
  competitionId?: number
  date?: string
  message?: string
  seasonId?: number
  teamId?: number
}): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl p-10">
      <Card>
        <CardContent className="p-6">
          <p className="font-medium">{message}</p>
          {teamId ? (
            <Link
              to="/teams/$teamId"
              params={{ teamId: String(teamId) }}
              search={{ competition: competitionId, date, season: seasonId }}
              className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}
            >
              <ArrowLeft className="size-4" />
              Back to team
            </Link>
          ) : competitionId ? (
            <Link
              to="/competitions/$competitionId"
              params={{ competitionId: String(competitionId) }}
              search={{ date, season: seasonId }}
              className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}
            >
              <ArrowLeft className="size-4" />
              Back to competition
            </Link>
          ) : (
            <Link
              to="/"
              search={{ date }}
              className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}
            >
              <ArrowLeft className="size-4" />
              Back to Matchday
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FixturePageSkeleton(): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 p-7 lg:p-10">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-52" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="order-first h-64 rounded-xl lg:order-last" />
      </div>
    </div>
  )
}

function createFixturePreviewInput(
  fixtureId: number,
  fixture: SportmonksFixture,
  startingAt: number | null,
  seasonId: number
): FixturePreviewInput | null {
  const home = fixtureParticipantAt(fixture, 'home')
  const away = fixtureParticipantAt(fixture, 'away')
  if (!home || !away || startingAt === null) return null

  return {
    fixtureId,
    seasonId,
    startingAt,
    homeTeamId: home.id,
    awayTeamId: away.id,
    timeZone: currentTimeZone()
  }
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

function formatFixtureDate(timestamp: number | null): string | null {
  if (timestamp === null) return null

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)
}

function formatFixtureTime(timestamp: number | null): string {
  if (timestamp === null) return 'TBD'

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)
}

function formatEventMinute(event: SportmonksEvent): string {
  return event.extra_minute ? `${event.minute}+${event.extra_minute}′` : `${event.minute}′`
}

function formatStatisticValue(value: number | string | null): string {
  return value === null ? '–' : String(value)
}

function formatOddLabel(odd: SportmonksOdd): string {
  return [
    ...new Set([odd.name, odd.label].filter((value): value is string => Boolean(value)))
  ].join(' · ')
}
