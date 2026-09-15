import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, CalendarDays, ChartNoAxesColumnIncreasing, Table2 } from 'lucide-react'
import type { ViewBlock, CompetitionViewBlock } from '@shared/views'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
import { StatisticViewBlockContent } from './statistic-view-blocks'
import { OddsViewBlockContent } from './odds-view-block'
import { BroadcastViewBlockContent } from './broadcast-view-block'
import { MarketShortlistBlockContent } from './market-shortlist-block'
import { ProbabilityBlockContent } from './probability-block'
import { MatchPreparationBlockContent } from './match-preparation-blocks'
import { TeamViewBlockContent } from './team-view-blocks'

export function ViewBlockOutline({ block }: { block: ViewBlock }): React.JSX.Element {
  const Icon =
    block.type === 'standings'
      ? Table2
      : block.type === 'fixtures'
        ? CalendarDays
        : ChartNoAxesColumnIncreasing
  return (
    <Card className="min-h-60 p-5" aria-label={`Placing ${block.type}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Icon className="size-4" />
        {viewBlockLabel(block)}
      </div>
      <div className="mt-7 space-y-4" aria-hidden="true">
        {[80, 100, 65, 90].map((width, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="size-5 rounded-full motion-reduce:animate-none" />
            <Skeleton
              className="h-1.5 motion-reduce:animate-none"
              style={{ width: `${width - 15}%` }}
            />
          </div>
        ))}
      </div>
    </Card>
  )
}

export function ViewBlockContent({
  block,
  blocks,
  onChange
}: {
  blocks: ViewBlock[]
  block: ViewBlock
  onChange: (block: ViewBlock) => void
}): React.JSX.Element {
  if (
    block.type === 'player-profile' ||
    block.type === 'player-comparison' ||
    block.type === 'team-comparison'
  )
    return <StatisticViewBlockContent block={block} onChange={onChange} />
  if (block.type === 'market-shortlist')
    return <MarketShortlistBlockContent block={block} onChange={onChange} />
  if ('fixtureSourceBlockId' in block) {
    const source = blocks.find(
      (candidate) =>
        (candidate.type === 'team-next-match' || candidate.type === 'market-shortlist') &&
        candidate.id === block.fixtureSourceBlockId
    )
    return source?.type === 'team-next-match' || source?.type === 'market-shortlist' ? (
      block.type === 'probability-context' ? (
        <ProbabilityBlockContent block={block} source={source} onChange={onChange} />
      ) : block.type === 'odds-comparison' ? (
        <OddsViewBlockContent block={block} source={source} onChange={onChange} />
      ) : block.type === 'fixture-broadcasts' ? (
        <BroadcastViewBlockContent block={block} source={source} onChange={onChange} />
      ) : (
        <MatchPreparationBlockContent block={block} source={source} />
      )
    ) : (
      <BlockEmpty>Choose a match source in Edit blocks.</BlockEmpty>
    )
  }
  if (
    block.type === 'team-squad' ||
    block.type === 'team-transfers' ||
    block.type === 'team-news' ||
    block.type === 'team-next-match' ||
    block.type === 'team-fixtures' ||
    block.type === 'team-season' ||
    block.type === 'team-season-results' ||
    block.type === 'team-availability' ||
    block.type === 'form-trend'
  )
    return <TeamViewBlockContent block={block} onChange={onChange} />
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
        <div className="view-data-scroll max-h-[470px] overflow-auto [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_table]:min-w-0 @max-[380px]/view-widget:[&_th:nth-child(3)]:hidden @max-[380px]/view-widget:[&_td:nth-child(3)]:hidden @max-[380px]/view-widget:[&_th:nth-child(4)]:hidden @max-[380px]/view-widget:[&_td:nth-child(4)]:hidden space-y-3">
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
        <div className="view-data-scroll max-h-[470px] overflow-auto [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_td]:whitespace-normal [&_td]:wrap-anywhere @max-[380px]/view-widget:[&_th:nth-child(3)]:hidden @max-[380px]/view-widget:[&_td:nth-child(3)]:hidden @max-[380px]/view-widget:[&_th]:px-2 @max-[380px]/view-widget:[&_td]:px-2">
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
          <div className="view-data-scroll max-h-[470px] overflow-auto [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring grid grid-cols-1 gap-2 @min-[520px]/view-widget:grid-cols-2 @min-[860px]/view-widget:grid-cols-3 pb-2">
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
