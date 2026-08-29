import { Link } from '@tanstack/react-router'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import type {
  SportmonksEvent,
  SportmonksFixture,
  SportmonksLineup,
  SportmonksOdd,
  SportmonksParticipant
} from '@shared/contracts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { CachedCompetition } from '@/data/db'
import { CompetitionLogo } from '@/features/competitions/competition-logo'
import { prefetchCompetitionWorkspace } from '@/features/competitions/use-competition-workspace'
import { PlayerPhoto } from '@/features/players/player-photo'
import { prefetchPlayerEntity } from '@/features/players/use-player'
import { TeamLogo } from '@/features/teams/team-logo'
import { prefetchTeamEntity } from '@/features/teams/use-team'
import { VenueCard } from '@/features/venues/venue-card'
import { isFixtureLive } from '@/lib/fixture-state'
import { useOnline } from '@/lib/use-online'
import { intentPrefetchProps } from '@/lib/prefetch'
import { cn } from '@/lib/utils'
import {
  fixtureOddsGroups,
  fixtureStatisticRows,
  fixtureStatisticShare,
  sortedFixtureEvents
} from './fixture-detail-data'
import { FixtureLiveIndicator } from './fixture-live-indicator'
import type { FixtureDetailSearch } from './fixture-route'
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
  const match = cachedFixture.raw
  const home = participantAt(match, 'home')
  const away = participantAt(match, 'away')
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
          seasonId={seasonId}
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

      {fixture.error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{fixture.error}</span>
        </div>
      )}
      {odds.error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{odds.error}</span>
        </div>
      )}

      <MatchScore
        competitionId={competitionId ?? cachedFixture.leagueId}
        context={{ competition: competitionId, date, season: seasonId, team: teamId }}
        fixture={match}
        fixtureId={parsedFixtureId}
        online={online}
        startingAt={cachedFixture.startingAt}
        view={view}
      />

      {view === 'preview' && (
        <FixturePreview
          competition={fixture.cached.competition}
          competitionId={competitionId ?? cachedFixture.leagueId}
          date={date}
          fixture={match}
          online={online}
          seasonId={seasonId}
          startingAt={cachedFixture.startingAt}
          teamId={teamId}
        />
      )}
      {view === 'timeline' && (
        <FixtureTimeline away={away} events={match.events ?? []} home={home} online={online} />
      )}
      {view === 'lineups' && (
        <FixtureLineups
          away={away}
          competitionId={competitionId ?? cachedFixture.leagueId}
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
  const home = participantAt(fixture, 'home')
  const away = participantAt(fixture, 'away')
  const scores = fixture.scores.filter(({ description }) => description === 'CURRENT')
  const homeScore = scores.find(({ score }) => score.participant === 'home')?.score.goals
  const awayScore = scores.find(({ score }) => score.participant === 'away')?.score.goals
  const hasScore = homeScore !== undefined || awayScore !== undefined
  const live = isFixtureLive(fixture.state_id)

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-8 sm:gap-8 sm:px-10 sm:py-10">
        <FixtureTeam competitionId={competitionId} online={online} participant={home} />

        <div className="flex min-w-20 flex-col items-center gap-2 text-center sm:min-w-32">
          {hasScore ? (
            <p className="text-3xl font-semibold tracking-tight tabular-nums sm:text-5xl">
              {homeScore ?? '–'} <span className="text-muted-foreground">–</span> {awayScore ?? '–'}
            </p>
          ) : (
            <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
              {formatFixtureTime(startingAt)}
            </p>
          )}
          {live ? (
            <FixtureLiveIndicator className="rounded-full bg-emerald-50 px-2.5 py-1 dark:bg-emerald-950/30" />
          ) : (
            <Badge variant="secondary">{fixture.state?.name ?? 'Scheduled'}</Badge>
          )}
        </div>

        <FixtureTeam competitionId={competitionId} online={online} participant={away} />
      </div>
      <FixtureNavigation context={context} fixtureId={fixtureId} view={view} />
    </section>
  )
}

function FixtureTeam({
  competitionId,
  online,
  participant
}: {
  competitionId: number
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
      search={{ competition: competitionId }}
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
  view
}: {
  context: FixtureDetailSearch
  fixtureId: number
  view: FixtureView
}): React.JSX.Element {
  const items: Array<{ label: string; to: string; view: FixtureView }> = [
    { label: 'Preview', to: '/fixtures/$fixtureId', view: 'preview' },
    { label: 'Timeline', to: '/fixtures/$fixtureId/timeline', view: 'timeline' },
    { label: 'Lineups', to: '/fixtures/$fixtureId/lineups', view: 'lineups' },
    { label: 'Stats', to: '/fixtures/$fixtureId/stats', view: 'stats' },
    { label: 'Odds', to: '/fixtures/$fixtureId/odds', view: 'odds' }
  ]
  const itemClassName =
    'relative px-0.5 pb-4 pt-3 text-sm font-medium outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <nav
      aria-label="Fixture"
      className="flex gap-6 overflow-x-auto border-t px-4 sm:justify-center"
    >
      {items.map((item) => (
        <Link
          key={item.view}
          aria-current={view === item.view ? 'page' : undefined}
          to={item.to}
          params={{ fixtureId: String(fixtureId) }}
          search={context}
          className={cn(
            itemClassName,
            view === item.view
              ? 'font-semibold text-foreground before:absolute before:inset-x-0 before:-top-px before:z-10 before:h-0.5 before:bg-current before:content-[""]'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

function FixturePreview({
  competition,
  competitionId,
  date,
  fixture,
  online,
  seasonId,
  startingAt,
  teamId
}: {
  competition: CachedCompetition | null
  competitionId: number
  date?: string
  fixture: SportmonksFixture
  online: boolean
  seasonId?: number
  startingAt: number | null
  teamId?: number
}): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-5">
      <FixtureDetails
        competition={competition}
        competitionId={competitionId}
        date={date}
        fixture={fixture}
        online={online}
        seasonId={seasonId}
        startingAt={startingAt}
      />
      {fixture.venue && fixture.venue_id && (
        <VenueCard
          competitionId={competitionId}
          countryName={fixture.venue.country?.name}
          online={online}
          teamId={teamId}
          venueId={fixture.venue_id}
          venueSummary={fixture.venue}
        />
      )}
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
                <span className="text-center text-sm font-semibold tabular-nums">
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
  competitionId,
  home,
  lineups,
  online
}: {
  away?: SportmonksParticipant
  competitionId: number
  home?: SportmonksParticipant
  lineups: SportmonksLineup[]
  online: boolean
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Lineups</h2>
      </div>
      {lineups.length === 0 ? (
        <div className="flex min-h-32 items-center justify-center px-4 text-sm text-muted-foreground">
          Lineups not available
        </div>
      ) : (
        <div className="grid divide-y lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <TeamLineup
            competitionId={competitionId}
            entries={lineups.filter(({ team_id }) => team_id === home?.id)}
            online={online}
            team={home}
          />
          <TeamLineup
            competitionId={competitionId}
            entries={lineups.filter(({ team_id }) => team_id === away?.id)}
            online={online}
            team={away}
          />
        </div>
      )}
    </section>
  )
}

function TeamLineup({
  competitionId,
  entries,
  online,
  team
}: {
  competitionId: number
  entries: SportmonksLineup[]
  online: boolean
  team?: SportmonksParticipant
}): React.JSX.Element {
  const starters = lineupGroup(entries, 11)
  const substitutes = lineupGroup(entries, 12)

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3 border-b bg-muted/25 px-4 py-3">
        <TeamLogo
          className="size-8 bg-background"
          imagePath={team?.image_path ?? null}
          online={online}
        />
        <h3 className="truncate text-sm font-semibold">{team?.name ?? 'Team'}</h3>
      </div>
      {entries.length === 0 ? (
        <div className="flex min-h-24 items-center justify-center px-4 text-sm text-muted-foreground">
          Not available
        </div>
      ) : (
        <div className="divide-y">
          <LineupGroup
            competitionId={competitionId}
            entries={starters}
            label="Starting XI"
            online={online}
            teamId={team?.id}
          />
          <LineupGroup
            competitionId={competitionId}
            entries={substitutes}
            label="Substitutes"
            online={online}
            teamId={team?.id}
          />
        </div>
      )}
    </div>
  )
}

function LineupGroup({
  competitionId,
  entries,
  label,
  online,
  teamId
}: {
  competitionId: number
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
        {entries.map((entry) => (
          <Link
            key={entry.id}
            to="/players/$playerId"
            params={{ playerId: String(entry.player_id) }}
            search={{ competition: competitionId, team: teamId }}
            className="grid grid-cols-[2rem_1fr] items-center gap-2 px-4 py-2 text-sm outline-none hover:bg-muted/45 focus-visible:bg-muted/45"
            {...intentPrefetchProps(online, () => prefetchPlayerEntity(entry.player_id))}
          >
            <span className="text-center font-medium tabular-nums text-muted-foreground">
              {entry.jersey_number ?? '–'}
            </span>
            <span className="truncate font-medium">{entry.player_name}</span>
          </Link>
        ))}
      </div>
    </div>
  )
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
                  <span className="font-semibold tabular-nums">
                    {formatStatisticValue(row.home)}
                  </span>
                  <span className="text-center text-muted-foreground">{row.label}</span>
                  <span className="text-right font-semibold tabular-nums">
                    {formatStatisticValue(row.away)}
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-muted"
                >
                  {share && (
                    <>
                      <span className="bg-blue-600" style={{ width: `${share.home}%` }} />
                      <span className="bg-red-500" style={{ width: `${share.away}%` }} />
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
                <span className="font-semibold tabular-nums">{odd.value}</span>
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
          <Detail label="Kickoff" value={formatFixtureDate(startingAt) ?? ''} />
        )}
        {fixture.stage?.name && <Detail label="Stage" value={fixture.stage.name} />}
        {fixture.round?.name && <Detail label="Round" value={fixture.round.name} />}
      </dl>
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="px-4 py-3.5">
      <dt className="mb-1 text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
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
        search={{ competition: competitionId }}
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
              search={{ competition: competitionId }}
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

function participantAt(
  fixture: SportmonksFixture,
  location: 'home' | 'away'
): SportmonksParticipant | undefined {
  return fixture.participants.find((participant) => participant.meta?.location === location)
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
