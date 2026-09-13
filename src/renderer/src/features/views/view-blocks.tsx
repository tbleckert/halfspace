import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, CalendarDays, ChartNoAxesColumnIncreasing, Table2 } from 'lucide-react'
import type { ViewBlock, CompetitionViewBlock } from '@shared/views'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { useCompetitionDetail } from '@/features/competitions/use-competition-detail'
import {
  useCompetitionFixtures,
  useCompetitionSeasons,
  useSeasonTopscorers,
  useStandings
} from '@/features/competitions/use-competition-workspace'
import {
  groupStandings,
  seasonFixtureDate
} from '@/features/competitions/competition-workspace-data'
import { StandingsTable } from '@/features/competitions/standings-table'
import { PlayerLeaders } from '@/features/competitions/player-leaders'
import { EntityFixtureRow } from '@/features/fixtures/entity-fixture-panel'
import { addDaysToIsoDate, currentTimeZone } from '@/lib/date'
import { useTodayInTimeZone } from '@/lib/use-today'
import { useOnline } from '@/lib/use-online'
import { isFixtureOngoing } from '@/lib/fixture-state'
import { viewBlockLabel } from './view-editing'
import { BlockPending, BlockEmpty, BlockError } from './view-block-state'
import { TeamViewBlockContent } from './team-view-blocks'

export function ViewBlockOutline({ block }: { block: ViewBlock }): React.JSX.Element {
  const Icon =
    block.type === 'standings'
      ? Table2
      : block.type === 'fixtures'
        ? CalendarDays
        : ChartNoAxesColumnIncreasing
  return (
    <div className="view-outline" aria-label={`Placing ${block.type}`}>
      <svg
        className="view-outline-stroke"
        aria-hidden="true"
        preserveAspectRatio="none"
        viewBox="0 0 400 230"
      >
        <rect x="1" y="1" width="398" height="228" rx="10" pathLength="1" />
      </svg>
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Icon className="size-4" />
        {viewBlockLabel(block)}
      </div>
      <div className="mt-7 space-y-4" aria-hidden="true">
        {[80, 100, 65, 90].map((width, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="size-5 rounded-full bg-primary/10" />
            <div className="h-1.5 rounded-full bg-primary/10" style={{ width: `${width - 15}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ViewBlockContent({
  block,
  onChange
}: {
  block: ViewBlock
  onChange: (block: ViewBlock) => void
}): React.JSX.Element {
  if (
    block.type === 'team-next-match' ||
    block.type === 'team-fixtures' ||
    block.type === 'team-season' ||
    block.type === 'team-availability'
  )
    return <TeamViewBlockContent block={block} />
  return <CompetitionBlockContent block={block} onChange={onChange} />
}

function CompetitionBlockContent({
  block,
  onChange
}: {
  block: CompetitionViewBlock
  onChange: (block: ViewBlock) => void
}): React.JSX.Element {
  const online = useOnline()
  const detail = useCompetitionDetail(block.competitionId, online)
  const seasons = useCompetitionSeasons(block.competitionId, online)
  const competition = detail.cached?.competition
  const season =
    seasons.cached?.seasons.find(({ id }) => id === block.seasonId) ??
    (competition?.raw.currentseason?.id === block.seasonId ? competition.raw.currentseason : null)
  const timeZone = useMemo(() => currentTimeZone(), [])
  const today = useTodayInTimeZone(timeZone)
  const date = seasonFixtureDate(season, today)
  const seasonUnavailable = Boolean(seasons.cached && !season)
  const datesUnavailable = Boolean(
    season && !season.is_current && (!season.starting_at || !season.ending_at)
  )
  return (
    <div className="space-y-2">
      <Link
        to="/competitions/$competitionId"
        params={{ competitionId: String(block.competitionId) }}
        search={{ season: block.seasonId, date }}
        className="flex w-fit max-w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
      >
        <span className="truncate">
          {competition?.name ?? `Competition ${block.competitionId}`} ·{' '}
          {season?.name ?? `Season ${block.seasonId}`}
        </span>
        <ArrowUpRight className="size-3 shrink-0" />
      </Link>
      {block.type === 'standings' && <StandingsBlock block={block} date={date} online={online} />}
      {block.type === 'leaders' && (
        <LeadersBlock block={block} date={date} online={online} onChange={onChange} />
      )}
      {block.type === 'fixtures' && (
        <FixturesBlock
          block={block}
          date={date}
          online={online}
          timeZone={timeZone}
          seasonKnown={Boolean(season) && !datesUnavailable}
          refreshSeason={seasons.refresh}
          seasonError={
            seasonUnavailable
              ? 'This season is no longer reported for the competition.'
              : datesUnavailable
                ? 'Fixture dates are unavailable for this season.'
                : (seasons.error ?? detail.error)
          }
        />
      )}
    </div>
  )
}

function StandingsBlock({
  block,
  date,
  online
}: {
  block: Extract<ViewBlock, { type: 'standings' }>
  date: string
  online: boolean
}): React.JSX.Element {
  const { cached, refreshing, error, refresh } = useStandings(block.seasonId, online)
  const groups = groupStandings(
    cached?.standings.filter(
      (row) => row.leagueId === block.competitionId && row.seasonId === block.seasonId
    ) ?? []
  )
  return (
    <div className="space-y-2">
      <BlockError error={error} online={online} refresh={refresh} />
      {!cached?.query ? (
        <BlockPending
          block={block}
          online={online}
          error={error}
          loading={cached === undefined || refreshing || (online && !error)}
        />
      ) : groups.length === 0 ? (
        <BlockEmpty>No standings reported for this season.</BlockEmpty>
      ) : (
        <div className="view-data-scroll view-standings space-y-3">
          {groups.map((group) => (
            <StandingsTable
              key={group.key}
              competitionId={block.competitionId}
              date={date}
              name={group.name}
              online={online}
              season={block.seasonId}
              standings={group.standings}
              highlightedTeamId={block.teamId ?? undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LeadersBlock({
  block,
  date,
  online,
  onChange
}: {
  block: Extract<ViewBlock, { type: 'leaders' }>
  date: string
  online: boolean
  onChange: (block: ViewBlock) => void
}): React.JSX.Element {
  const { cached, refreshing, error, refresh } = useSeasonTopscorers(block.seasonId, online)
  return (
    <div className="space-y-2">
      <BlockError error={error} online={online} refresh={refresh} />
      {!cached ? (
        <BlockPending
          block={block}
          online={online}
          error={error}
          loading={cached === undefined || refreshing || (online && !error)}
        />
      ) : (
        <div className="view-data-scroll view-leaders">
          <PlayerLeaders
            competitionId={block.competitionId}
            date={date}
            seasonId={block.seasonId}
            online={online}
            loaded
            loading={refreshing}
            topscorers={cached.topscorers}
            category={block.category}
            onCategoryChange={(category) => onChange({ ...block, category })}
          />
        </div>
      )}
    </div>
  )
}

function FixturesBlock({
  block,
  date,
  timeZone,
  online,
  seasonKnown,
  refreshSeason,
  seasonError
}: {
  block: Extract<ViewBlock, { type: 'fixtures' }>
  date: string
  timeZone: string
  online: boolean
  seasonKnown: boolean
  refreshSeason: () => Promise<void>
  seasonError: string | null
}): React.JSX.Element {
  const input = useMemo(
    () =>
      seasonKnown
        ? {
            competitionId: block.competitionId,
            timeZone,
            startDate: block.period === 'recent' ? addDaysToIsoDate(date, -14) : date,
            endDate: block.period === 'recent' ? date : addDaysToIsoDate(date, 14)
          }
        : null,
    [block.competitionId, block.period, date, timeZone, seasonKnown]
  )
  const { cached, refreshing, error: queryError, refresh } = useCompetitionFixtures(input, online)
  const error = queryError ?? seasonError
  const fixtures = (cached?.fixtures ?? [])
    .filter(
      (fixture) =>
        fixture.seasonId === block.seasonId &&
        (block.period === 'recent'
          ? [5, 7, 8].includes(fixture.stateId)
          : fixture.stateId === 1 || isFixtureOngoing(fixture.stateId))
    )
    .toSorted((a, b) =>
      block.period === 'recent'
        ? (b.startingAt ?? 0) - (a.startingAt ?? 0)
        : (a.startingAt ?? 0) - (b.startingAt ?? 0)
    )
  return (
    <div className="space-y-2">
      <BlockError error={error} online={online} refresh={seasonKnown ? refresh : refreshSeason} />
      {!cached?.query || !seasonKnown ? (
        <BlockPending
          block={block}
          online={online}
          error={error}
          loading={cached === undefined || refreshing || (online && !error)}
        />
      ) : (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>
              {block.period === 'recent' ? 'Recent results' : 'Upcoming fixtures'}
            </CardTitle>
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {input!.startDate} – {input!.endDate}
            </p>
          </CardHeader>
          <div className="view-data-scroll view-fixture-list pb-2">
            {fixtures.length ? (
              fixtures.map((fixture) => (
                <EntityFixtureRow
                  key={fixture.id}
                  context={{ competition: block.competitionId, season: block.seasonId, date }}
                  dateDisplay="full"
                  fixture={fixture}
                  online={online}
                  fixtureSeasonLinks
                  showCompetition={false}
                />
              ))
            ) : (
              <p className="p-6 text-sm text-muted-foreground">
                No {block.period === 'recent' ? 'results' : 'fixtures'} reported in this window.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
