import { EntitySubpageNavigation } from '@/components/entity-subpage-navigation'
import { entitySubpageNavigationItemClassName } from '@/components/entity-subpage-navigation-variants'
import { ErrorAlert } from '@/components/error-alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { CachedCompetition, CachedFixture } from '@/data/db'
import { CoachPhoto } from '@/features/coaches/coach-photo'
import { prefetchCoachEntity } from '@/features/coaches/use-coach'
import { CompetitionLogo } from '@/features/competitions/competition-logo'
import { prefetchCompetitionWorkspace } from '@/features/competitions/use-competition-workspace'
import { FixtureOfficials } from '@/features/referees/fixture-officials'
import { TeamLogo } from '@/features/teams/team-logo'
import { prefetchTeamEntity } from '@/features/teams/use-team'
import { VenueCard } from '@/features/venues/venue-card'
import { currentTimeZone } from '@/lib/date'
import { currentFixtureScore, fixtureParticipantAt } from '@/lib/fixture'
import { isFixtureLive, isFixtureOngoing } from '@/lib/fixture-state'
import { intentPrefetchProps } from '@/lib/prefetch'
import { useOnline } from '@/lib/use-online'
import { cn } from '@/lib/utils'
import type { SportmonksCoach, SportmonksFixture, SportmonksParticipant } from '@shared/contracts'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useSubscription } from '@/features/subscription/use-subscription'
import { featureAccess } from '@/features/subscription/subscription-access'
import type { OddsFeed } from '@shared/contracts'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { FixtureCommentary } from './fixture-commentary'
import { FixtureTv } from './fixture-tv'
import { FixtureWeather } from './fixture-weather'
import { FixtureNews } from '@/features/news/fixture-news'
import { FixtureMatchFacts } from './fixture-match-facts'
import { FixtureLineupView } from './fixture-lineup-view'
import { FixtureLiveIndicator } from './fixture-live-indicator'
import { FixtureOdds } from './fixture-odds'
import { FixturePreviewWorkspace } from './fixture-preview'
import { defaultFixtureView, type FixtureDetailSearch } from './fixture-route'
import { FixtureStats } from './fixture-stats'
import { FixtureGame } from './fixture-game'
import { useCommentary } from './use-commentary'
import { useTrends } from './use-trends'
import { usePressure } from './use-pressure'
import { prefetchFixturePreview, type FixturePreviewInput } from './use-fixture-preview'
import { useFixtureEntity, useFixtureOdds } from './use-fixtures'

export type FixtureView = 'preview' | 'game' | 'lineups' | 'stats' | 'odds' | 'commentary'

interface FixtureDetailPageProps {
  competitionId?: number
  date?: string
  fixtureId: string
  seasonId?: number
  teamId?: number
  view?: FixtureView
  oddsFeed?: OddsFeed
  marketId?: number
  bookmakerId?: number
}

export function FixtureDetailPage({
  competitionId,
  date,
  fixtureId,
  seasonId,
  teamId,
  view: requestedView,
  oddsFeed,
  marketId,
  bookmakerId
}: FixtureDetailPageProps): React.JSX.Element {
  const navigate = useNavigate()
  const router = useRouter()
  const parsedFixtureId = Number(fixtureId)
  const validFixtureId = Number.isSafeInteger(parsedFixtureId) && parsedFixtureId > 0
  const online = useOnline()
  const fixture = useFixtureEntity(validFixtureId ? parsedFixtureId : null, online)
  const cachedStateId = fixture.cached?.fixture?.stateId
  const view = requestedView ?? defaultFixtureView(cachedStateId ?? 1)

  useEffect(() => {
    if (requestedView || cachedStateId === undefined) return
    if (router.latestLocation.pathname.replace(/\/$/, '') !== `/fixtures/${fixtureId}`) return
    void navigate({
      to:
        defaultFixtureView(cachedStateId) === 'game'
          ? '/fixtures/$fixtureId/game'
          : '/fixtures/$fixtureId/preview',
      params: { fixtureId },
      search: (previous) => previous,
      replace: true,
      resetScroll: false
    })
  }, [requestedView, cachedStateId, fixtureId, navigate, router])

  const commentary = useCommentary(
    validFixtureId && view === 'commentary' ? parsedFixtureId : null,
    online && view === 'commentary',
    isFixtureOngoing(fixture.cached?.fixture?.stateId ?? 0)
  )
  const live = isFixtureOngoing(fixture.cached?.fixture?.stateId ?? 0)
  const selectedFeed = oddsFeed ?? (live ? 'inplay' : 'pre-match')
  const subscription = useSubscription(online && (view === 'odds' || view === 'game'))
  const pressureAccess = featureAccess(subscription.cached, 'pressure')
  const pressure = usePressure(
    validFixtureId && view === 'game' ? parsedFixtureId : null,
    online && view === 'game' && pressureAccess !== 'not-included',
    live
  )
  const trendsAccess = featureAccess(subscription.cached, 'trends')
  const trends = useTrends(
    validFixtureId && view === 'game' ? parsedFixtureId : null,
    online && view === 'game' && trendsAccess !== 'not-included',
    live
  )
  const oddsAccess = featureAccess(
    subscription.cached,
    selectedFeed === 'inplay' ? 'inplay' : 'prematch'
  )
  const odds = useFixtureOdds(
    validFixtureId && view === 'odds' ? parsedFixtureId : null,
    online && view === 'odds' && oddsAccess !== 'not-included',
    selectedFeed,
    live
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
  const refreshing =
    fixture.refreshing ||
    odds.refreshing ||
    commentary.refreshing ||
    pressure.refreshing ||
    trends.refreshing

  async function refresh(): Promise<void> {
    await Promise.all([
      fixture.refresh(),
      view === 'odds' ? odds.refresh() : Promise.resolve(),
      view === 'commentary' ? commentary.refresh() : Promise.resolve(),
      view === 'game' && pressureAccess !== 'not-included' ? pressure.refresh() : Promise.resolve(),
      view === 'game' ? trends.refresh() : Promise.resolve()
    ])
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
      {view === 'odds' && odds.error && <ErrorAlert>{odds.error}</ErrorAlert>}
      {view === 'commentary' && commentary.error && <ErrorAlert>{commentary.error}</ErrorAlert>}
      {view === 'game' && pressure.error && <ErrorAlert>{pressure.error}</ErrorAlert>}
      {view === 'game' && trends.error && <ErrorAlert>{trends.error}</ErrorAlert>}

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
      {view === 'game' && (
        <>
          <FixtureGame
            fixture={match}
            context={{ competition: competitionId, date, season: resolvedSeasonId, team: teamId }}
            pressure={pressure.cached}
            trends={trends.cached}
            online={online}
          />
          <FixtureNews fixture={match} online={online} />
        </>
      )}
      {view === 'commentary' && (
        <FixtureCommentary
          key={parsedFixtureId}
          cached={commentary.cached}
          loading={commentary.refreshing}
          online={online}
          context={{
            competition: competitionId ?? cachedFixture.leagueId,
            date,
            season: resolvedSeasonId
          }}
        />
      )}
      {view === 'lineups' && (
        <FixtureLineupView
          fixture={match}
          context={{
            competition: competitionId ?? cachedFixture.leagueId,
            date,
            season: resolvedSeasonId
          }}
          online={online}
        />
      )}
      {view === 'stats' && (
        <FixtureStats
          away={away}
          context={{
            competition: competitionId ?? cachedFixture.leagueId,
            date,
            season: resolvedSeasonId
          }}
          home={home}
          lineups={match.lineups ?? []}
          online={online}
          statistics={match.statistics ?? []}
        />
      )}
      {view === 'odds' && (
        <FixtureOdds
          loading={odds.cached === undefined || (odds.refreshing && odds.cached.odds.length === 0)}
          odds={(odds.cached?.odds ?? []).map(({ raw }) => raw)}
          offline={!online}
          feed={selectedFeed}
          live={live}
          access={oddsAccess}
          fetchedAt={odds.cached?.query?.fetchedAt}
          marketId={marketId}
          bookmakerId={bookmakerId}
          onSelect={(selection) =>
            void navigate({
              to: '/fixtures/$fixtureId/odds',
              params: { fixtureId },
              search: (previous) => ({
                ...previous,
                oddsFeed: selection.oddsFeed,
                market: selection.market,
                bookmaker: selection.bookmaker
              }),
              resetScroll: false
            })
          }
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
    { label: 'Preview', to: '/fixtures/$fixtureId/preview', view: 'preview' },
    { label: 'Game', to: '/fixtures/$fixtureId/game', view: 'game' },
    { label: 'Commentary', to: '/fixtures/$fixtureId/commentary', view: 'commentary' },
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
      <div className="flex min-w-0 flex-col gap-5">
        <FixtureNews fixture={cachedFixture.raw} online={online} />
        <FixtureMatchFacts key={cachedFixture.id} fixture={cachedFixture.raw} online={online} />
        <FixturePreviewWorkspace
          context={context}
          fixture={cachedFixture}
          input={previewInput}
          online={online}
        />
      </div>
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
        {cachedFixture.raw.coaches && cachedFixture.raw.coaches.length > 0 && (
          <FixtureCoaches
            coaches={cachedFixture.raw.coaches}
            context={context}
            fixture={cachedFixture.raw}
            online={online}
          />
        )}
        <FixtureOfficials
          assignments={cachedFixture.raw.referees ?? []}
          context={context}
          fixtureId={cachedFixture.id}
          online={online}
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
        <FixtureWeather report={cachedFixture.raw.weatherreport} />
        <FixtureTv
          key={cachedFixture.id}
          fixtureId={cachedFixture.id}
          competitionId={competitionId}
          seasonId={seasonId}
          online={online}
        />
      </aside>
    </div>
  )
}

function FixtureCoaches({
  coaches,
  context,
  fixture,
  online
}: {
  coaches: SportmonksCoach[]
  context: FixtureDetailSearch
  fixture: SportmonksFixture
  online: boolean
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Coaches</h2>
      </div>
      <div className="divide-y">
        {coaches.map((coach) => {
          const team = fixture.participants.find(({ id }) => id === coach.meta?.participant_id)

          return (
            <Link
              key={coach.id}
              to="/coaches/$coachId"
              params={{ coachId: String(coach.id) }}
              search={{
                competition: context.competition,
                date: context.date,
                season: context.season,
                team: team?.id ?? context.team
              }}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/45"
              {...intentPrefetchProps(online, () => prefetchCoachEntity(coach.id))}
            >
              <CoachPhoto
                className="size-10 rounded-full bg-background"
                imagePath={coach.image_path ?? null}
                online={online}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{coach.display_name}</p>
                {team && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{team.name}</p>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
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
