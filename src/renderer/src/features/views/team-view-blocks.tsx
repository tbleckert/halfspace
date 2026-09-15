import { TeamSeasonResults } from './team-season-results'
import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import type { TeamViewBlock } from '@shared/views'
import type { CachedFixture } from '@/data/db'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { useOnline } from '@/lib/use-online'
import { useCurrentTime } from '@/lib/use-current-time'
import { useTodayInTimeZone } from '@/lib/use-today'
import { currentTimeZone, formatFixtureTime } from '@/lib/date'
import { fixtureParticipantAt } from '@/lib/fixture'
import { intentPrefetchProps } from '@/lib/prefetch'
import { useTeamEntity, useTeamFixtures } from '@/features/teams/use-team'
import { TeamLogo } from '@/features/teams/team-logo'
import { TeamAvailability } from '@/features/teams/team-availability'
import { EntityFixtureRow } from '@/features/fixtures/entity-fixture-panel'
import { FixtureVenueBackground } from '@/features/fixtures/fixture-venue-background'
import { prefetchFixtureEntity } from '@/features/fixtures/use-fixtures'
import {
  useCompetitionSeasons,
  useStandings
} from '@/features/competitions/use-competition-workspace'
import { groupStandings } from '@/features/competitions/competition-workspace-data'
import { recentStandingForm, standingDetailValue } from '@/features/competitions/standing-details'
import { useCompetitionDetail } from '@/features/competitions/use-competition-detail'
import { BlockPending, BlockEmpty, BlockError } from './view-block-state'
import { selectTeamViewFixtures, teamViewFixtureInput } from './team-view-data'
import { TeamSquadBlock, TeamTransfersBlock } from './team-roster-blocks'
import { TeamNewsBlock } from './team-news-block'
import { FormTrendBlock } from './form-trend-block'

export function TeamViewBlockContent({
  block,
  onChange
}: {
  block: TeamViewBlock
  onChange: (block: TeamViewBlock) => void
}): React.JSX.Element {
  const online = useOnline()
  const identity = useTeamEntity(block.teamId, online)
  const team = identity.cached?.team ?? identity.cached?.participant
  const timeZone = useMemo(() => currentTimeZone(), [])
  const today = useTodayInTimeZone(timeZone)
  return (
    <div className="space-y-2">
      <Link
        to="/teams/$teamId"
        params={{ teamId: String(block.teamId) }}
        search={{
          date: today,
          competition: 'competitionId' in block ? block.competitionId : undefined,
          season: 'seasonId' in block ? block.seasonId : undefined
        }}
        className="flex w-fit max-w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
      >
        <span className="truncate">{team?.name ?? `Team ${block.teamId}`}</span>
        <ArrowUpRight className="size-3 shrink-0" />
      </Link>
      {block.type === 'team-season-results' ? (
        <TeamSeasonResults block={block} online={online} />
      ) : block.type === 'team-squad' ? (
        <TeamSquadBlock block={block} online={online} />
      ) : block.type === 'team-transfers' ? (
        <TeamTransfersBlock block={block} online={online} today={today} onChange={onChange} />
      ) : block.type === 'team-news' ? (
        <TeamNewsBlock block={block} online={online} today={today} timeZone={timeZone} />
      ) : block.type === 'form-trend' ? (
        <FormTrendBlock
          block={block}
          online={online}
          today={today}
          timeZone={timeZone}
          onChange={onChange}
        />
      ) : block.type === 'team-season' ? (
        <TeamSeasonBlock block={block} online={online} date={today} />
      ) : block.type === 'team-availability' ? (
        <div className="space-y-2">
          <BlockError error={identity.error} online={online} refresh={identity.refresh} />
          {!identity.cached?.team ? (
            <BlockPending
              block={block}
              online={online}
              error={identity.error}
              loading={identity.refreshing || identity.cached === undefined}
            />
          ) : (
            <TeamAvailability
              absences={identity.cached.team.raw.sidelined}
              online={online}
              teamId={block.teamId}
              listProps={{
                className:
                  'view-dashboard-scroll max-h-[min(470px,60dvh)] overflow-auto overscroll-y-contain [scrollbar-width:thin] [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring grid grid-cols-1 items-start space-y-0 gap-y-2 @min-[520px]/view-widget:grid-cols-2 @min-[860px]/view-widget:grid-cols-3 rounded-b-xl',
                role: 'region',
                'aria-label': 'Current absences list',
                tabIndex: 0
              }}
            />
          )}
        </div>
      ) : (
        <TeamFixturesBlock block={block} online={online} today={today} timeZone={timeZone} />
      )}
    </div>
  )
}

function TeamFixturesBlock({
  block,
  online,
  today,
  timeZone
}: {
  block: Extract<TeamViewBlock, { type: 'team-next-match' | 'team-fixtures' }>
  online: boolean
  today: string
  timeZone: string
}): React.JSX.Element {
  const input = useMemo(
    () => teamViewFixtureInput(block.teamId, today, timeZone),
    [block.teamId, today, timeZone]
  )
  const query = useTeamFixtures(input, online)
  const now = useCurrentTime()
  const period = block.type === 'team-next-match' ? 'upcoming' : block.period
  const fixtures = selectTeamViewFixtures(query.cached?.fixtures ?? [], block.teamId, period, now)
  const next = fixtures[0]
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
      ) : block.type === 'team-next-match' ? (
        next ? (
          <NextMatch fixture={next} teamId={block.teamId} date={today} online={online} />
        ) : (
          <BlockEmpty>No scheduled match reported in the next 30 days.</BlockEmpty>
        )
      ) : (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{period === 'upcoming' ? 'On the calendar' : 'Recent results'}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {period === 'upcoming' ? 'Next' : 'Last'} 30 days · All competitions
            </p>
          </CardHeader>
          <div className="view-data-scroll max-h-[470px] overflow-auto [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring grid grid-cols-1 gap-2 @min-[520px]/view-widget:grid-cols-2 @min-[860px]/view-widget:grid-cols-3 px-2 pb-2">
            {fixtures.length ? (
              fixtures.map((fixture) => (
                <EntityFixtureRow
                  key={fixture.id}
                  context={{ team: block.teamId, date: today, competition: fixture.leagueId }}
                  dateDisplay="full"
                  fixture={fixture}
                  online={online}
                  fixtureSeasonLinks
                  showCompetition
                />
              ))
            ) : (
              <p className="p-4 text-sm text-muted-foreground">
                No {period === 'upcoming' ? 'scheduled matches' : 'results'} reported in this
                window.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

function NextMatch({
  fixture,
  teamId,
  date,
  online
}: {
  fixture: CachedFixture
  teamId: number
  date: string
  online: boolean
}): React.JSX.Element {
  const home = fixtureParticipantAt(fixture.raw, 'home')
  const away = fixtureParticipantAt(fixture.raw, 'away')
  return (
    <Card className="relative isolate overflow-hidden bg-sidebar-accent py-0">
      <FixtureVenueBackground imagePath={fixture.raw.venue?.image_path ?? null} online={online} />
      <Link
        to="/fixtures/$fixtureId"
        params={{ fixtureId: String(fixture.id) }}
        search={{ date, team: teamId, competition: fixture.leagueId, season: fixture.seasonId }}
        className="flex flex-col gap-6 @min-[860px]/view-widget:gap-8 @min-[860px]/view-widget:p-7 relative rounded-xl p-5 outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        {...intentPrefetchProps(online, () => prefetchFixtureEntity(fixture.id))}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Next match</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {fixture.raw.league?.name ?? `Competition ${fixture.leagueId}`}
            </p>
          </div>
          <ArrowUpRight className="size-4 text-primary" />
        </div>
        <div className="flex flex-col items-stretch gap-4.5 @min-[520px]/view-widget:grid @min-[520px]/view-widget:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @min-[520px]/view-widget:items-center">
          <div className="flex items-center gap-3 text-xl font-semibold tracking-tight [&>span]:wrap-anywhere @min-[520px]/view-widget:last:flex-row-reverse @min-[520px]/view-widget:last:text-right @min-[860px]/view-widget:text-[28px]">
            <TeamLogo
              className="size-10 bg-transparent"
              online={online}
              imagePath={home?.image_path ?? null}
            />
            <span>{home?.name ?? 'Home team'}</span>
          </div>
          <div className="text-center">
            <span className="font-mono text-3xl tabular-nums">
              {formatFixtureTime(fixture.startingAt)}
            </span>
            <time className="mt-1 block text-xs text-muted-foreground">
              {new Intl.DateTimeFormat(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              }).format(fixture.startingAt!)}
            </time>
          </div>
          <div className="flex items-center gap-3 text-xl font-semibold tracking-tight [&>span]:wrap-anywhere @min-[520px]/view-widget:last:flex-row-reverse @min-[520px]/view-widget:last:text-right @min-[860px]/view-widget:text-[28px]">
            <TeamLogo
              className="size-10 bg-transparent"
              online={online}
              imagePath={away?.image_path ?? null}
            />
            <span>{away?.name ?? 'Away team'}</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
          <span>{fixture.raw.venue?.name ?? 'Venue not reported'}</span>
          <span>Open match brief</span>
        </div>
      </Link>
    </Card>
  )
}

function TeamSeasonBlock({
  block,
  date,
  online
}: {
  block: Extract<TeamViewBlock, { type: 'team-season' }>
  date: string
  online: boolean
}): React.JSX.Element {
  const query = useStandings(block.seasonId, online)
  const competition = useCompetitionDetail(block.competitionId, online)
  const seasons = useCompetitionSeasons(block.competitionId, online)
  const currentSeason = competition.cached?.competition?.raw.currentseason
  const season =
    seasons.cached?.seasons.find(({ id }) => id === block.seasonId) ??
    (currentSeason?.id === block.seasonId ? currentSeason : null)
  const groups = groupStandings(
    (query.cached?.standings ?? []).filter(
      (standing) =>
        standing.leagueId === block.competitionId && standing.seasonId === block.seasonId
    )
  )
  const rows = groups.flatMap((group) =>
    group.standings
      .filter((standing) => standing.participantId === block.teamId)
      .map((standing) => ({ standing, name: group.name }))
  )
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
      ) : !rows.length ? (
        <BlockEmpty>No standing reported for this team in the selected season.</BlockEmpty>
      ) : (
        rows.map(({ standing, name }) => (
          <Card key={standing.id} className="p-5">
            <div>
              <h3 className="font-semibold">Season snapshot</h3>
              <Link
                to="/competitions/$competitionId"
                params={{ competitionId: String(block.competitionId) }}
                search={{ season: block.seasonId, date }}
                className="mt-1 block text-xs text-muted-foreground hover:text-primary"
              >
                {competition.cached?.competition?.name ?? `Competition ${block.competitionId}`} ·{' '}
                {season?.name ?? `Season ${block.seasonId}`} · {name}
              </Link>
            </div>
            <div className="mt-5 grid gap-6 @min-[860px]/view-widget:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] @min-[860px]/view-widget:items-center">
              <dl className="grid grid-cols-2 gap-x-3.5 gap-y-5 [&_dd]:ml-0 @min-[520px]/view-widget:grid-cols-4">
                {[
                  ['Position', standing.position],
                  ['Points', standing.raw.points],
                  ['Played', standingDetailValue(standing.raw.details, 129)],
                  ['Goal difference', standingDetailValue(standing.raw.details, 179)]
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-2 font-mono text-2xl tabular-nums">{value ?? '—'}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <p className="mb-2 text-xs text-muted-foreground">
                  Reported form · latest on the right
                </p>
                <div className="flex flex-wrap gap-1">
                  {recentStandingForm(standing.raw.form).map((result) => (
                    <Link
                      key={result.id}
                      to="/fixtures/$fixtureId"
                      params={{ fixtureId: String(result.fixture_id) }}
                      search={{
                        competition: block.competitionId,
                        season: block.seasonId,
                        team: block.teamId,
                        date
                      }}
                      aria-label={`${result.form === 'W' ? 'Win' : result.form === 'D' ? 'Draw' : 'Loss'}, open match`}
                      className={`flex size-6 items-center justify-center rounded-sm font-mono text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring ${result.form === 'W' ? 'bg-success/15 text-success-emphasis' : result.form === 'L' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}
                    >
                      {result.form}
                    </Link>
                  ))}
                  {!recentStandingForm(standing.raw.form).length && (
                    <p className="text-xs text-muted-foreground">Form not reported</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
