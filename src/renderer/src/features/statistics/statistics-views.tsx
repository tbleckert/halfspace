import type {
  SportmonksPlayerStatistic,
  SportmonksSeasonStatistic,
  SportmonksTeamStatistic
} from '@shared/contracts'
import { BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  leagueStatisticsSummary,
  playerStatisticsSummary,
  teamStatisticsSummary,
  type LeagueStatisticsSummary,
  type PlayerStatisticsSummary,
  type TeamStatisticsSummary
} from './statistics-data'

export function LeagueStatisticsView({
  loaded,
  loading,
  statistics
}: {
  loaded: boolean
  loading: boolean
  statistics: SportmonksSeasonStatistic[]
}): React.JSX.Element {
  if (!loaded || (loading && statistics.length === 0)) return <StatisticsSkeleton />

  const summary = leagueStatisticsSummary(statistics)
  if (!hasValues(summary)) return <StatisticsEmpty />

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold tracking-tight">Stats</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatisticCard label="Matches played" value={formatNumber(summary.matches)} />
        <StatisticCard label="Goals" value={formatNumber(summary.goals)} />
        <StatisticCard label="Goals per match" value={formatDecimal(summary.goalsPerMatch)} />
        <StatisticCard label="Teams" value={formatNumber(summary.teams)} />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <LeagueGoals summary={summary} />
        <StatisticList
          title="Season"
          rows={[
            { label: 'Draws', value: formatNumber(summary.draws) },
            {
              label: 'Both teams scored',
              value:
                summary.bothTeamsScoredPercentage === null
                  ? formatNumber(summary.bothTeamsScored)
                  : `${formatDecimal(summary.bothTeamsScoredPercentage)}%`
            },
            { label: 'Clean sheets', value: formatNumber(summary.cleanSheets) },
            { label: 'Cards', value: formatNumber(summary.cards) }
          ]}
        />
      </div>
    </section>
  )
}

export function TeamStatisticsView({
  context,
  loaded,
  loading,
  statistics
}: {
  context: string | null
  loaded: boolean
  loading: boolean
  statistics: SportmonksTeamStatistic[]
}): React.JSX.Element {
  if (!loaded || (loading && statistics.length === 0)) return <StatisticsSkeleton />

  const summary = teamStatisticsSummary(statistics)
  if (!hasValues(summary)) return <StatisticsEmpty />

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight">Stats</h2>
        {context && <p className="text-sm text-muted-foreground">{context}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatisticCard label="Matches" value={formatNumber(summary.matches)} />
        <StatisticCard label="Goals" value={formatNumber(summary.goalsFor)} />
        <StatisticCard label="Goals against" value={formatNumber(summary.goalsAgainst)} />
        <StatisticCard label="Clean sheets" value={formatNumber(summary.cleanSheets)} />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <TeamRecord summary={summary} />
        <StatisticList
          title="Per match"
          rows={[
            { label: 'Goals', value: formatDecimal(summary.goalsForPerMatch) },
            { label: 'Goals against', value: formatDecimal(summary.goalsAgainstPerMatch) },
            {
              label: 'Possession',
              value:
                summary.averagePossession === null
                  ? null
                  : `${formatDecimal(summary.averagePossession)}%`
            },
            { label: 'Shots', value: formatDecimal(summary.shotsPerMatch) },
            { label: 'Corners', value: formatDecimal(summary.cornersPerMatch) }
          ]}
        />
        <StatisticList
          title="Discipline"
          rows={[
            { label: 'Yellow cards', value: formatNumber(summary.yellowCards) },
            { label: 'Red cards', value: formatNumber(summary.redCards) }
          ]}
        />
      </div>
    </section>
  )
}

export function PlayerStatisticsView({
  context,
  loaded,
  loading,
  statistics,
  teamId
}: {
  context: string | null
  loaded: boolean
  loading: boolean
  statistics: SportmonksPlayerStatistic[]
  teamId?: number
}): React.JSX.Element {
  if (!loaded || (loading && statistics.length === 0)) return <StatisticsSkeleton />

  const teamStatistics = teamId
    ? statistics.filter((statistic) => statistic.team_id === teamId)
    : statistics
  const summary = playerStatisticsSummary(teamStatistics.flatMap((statistic) => statistic.details))

  if (!hasValues(summary)) return <StatisticsEmpty />

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight">Stats</h2>
        {context && <p className="text-sm text-muted-foreground">{context}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatisticCard label="Appearances" value={formatNumber(summary.appearances)} />
        <StatisticCard label="Starts" value={formatNumber(summary.starts)} />
        <StatisticCard label="Minutes" value={formatNumber(summary.minutes)} />
        <StatisticCard label="Rating" value={formatDecimal(summary.rating)} />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <PlayerAttacking summary={summary} />
        <StatisticList
          title="Passing"
          rows={[
            { label: 'Passes', value: formatNumber(summary.passes) },
            { label: 'Accurate passes', value: formatNumber(summary.accuratePasses) },
            {
              label: 'Pass accuracy',
              value:
                summary.passAccuracy === null ? null : `${formatDecimal(summary.passAccuracy)}%`
            },
            { label: 'Key passes', value: formatNumber(summary.keyPasses) }
          ]}
        />
        <StatisticList
          title="Defending"
          rows={[
            { label: 'Tackles', value: formatNumber(summary.tackles) },
            { label: 'Interceptions', value: formatNumber(summary.interceptions) },
            { label: 'Clearances', value: formatNumber(summary.clearances) },
            { label: 'Duels won', value: formatNumber(summary.duelsWon) }
          ]}
        />
        <StatisticList
          title="Discipline"
          rows={[
            { label: 'Fouls', value: formatNumber(summary.fouls) },
            { label: 'Yellow cards', value: formatNumber(summary.yellowCards) },
            { label: 'Red cards', value: formatNumber(summary.redCards) }
          ]}
        />
        <StatisticList
          title="Goalkeeping"
          rows={[
            { label: 'Saves', value: formatNumber(summary.saves) },
            { label: 'Goals conceded', value: formatNumber(summary.goalsConceded) },
            { label: 'Clean sheets', value: formatNumber(summary.cleanSheets) }
          ]}
        />
      </div>
    </section>
  )
}

function PlayerAttacking({ summary }: { summary: PlayerStatisticsSummary }): React.JSX.Element {
  return (
    <StatisticList
      title="Attacking"
      rows={[
        { label: 'Goals', value: formatNumber(summary.goals) },
        { label: 'Assists', value: formatNumber(summary.assists) },
        { label: 'Shots', value: formatNumber(summary.shots) },
        { label: 'Shots on target', value: formatNumber(summary.shotsOnTarget) },
        { label: 'Expected goals', value: formatDecimal(summary.expectedGoals) }
      ]}
    />
  )
}

function StatisticCard({
  label,
  value
}: {
  label: string
  value: string | null
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="px-5 py-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 font-mono text-3xl font-semibold tracking-tight tabular-nums">
          {value ?? '–'}
        </p>
      </CardContent>
    </Card>
  )
}

function LeagueGoals({ summary }: { summary: LeagueStatisticsSummary }): React.JSX.Element {
  const home = summary.homeGoals ?? 0
  const away = summary.awayGoals ?? 0
  const total = home + away
  const homeShare = total > 0 ? (home / total) * 100 : 50

  return (
    <section className="rounded-xl border bg-card p-5 shadow-xs">
      <h3 className="text-sm font-semibold">Goals</h3>
      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {formatNumber(summary.homeGoals) ?? '–'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Home</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {formatNumber(summary.awayGoals) ?? '–'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Away</p>
        </div>
      </div>
      {total > 0 && (
        <div aria-hidden="true" className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted">
          <span className="bg-chart-1" style={{ width: `${homeShare}%` }} />
          <span className="flex-1 bg-chart-2" />
        </div>
      )}
    </section>
  )
}

function TeamRecord({ summary }: { summary: TeamStatisticsSummary }): React.JSX.Element {
  const wins = summary.wins ?? 0
  const draws = summary.draws ?? 0
  const losses = summary.losses ?? 0
  const total = wins + draws + losses

  return (
    <section className="rounded-xl border bg-card p-5 shadow-xs">
      <h3 className="text-sm font-semibold">Record</h3>
      <div className="mt-6 grid grid-cols-3 gap-4">
        <RecordValue label="Wins" value={summary.wins} />
        <RecordValue label="Draws" value={summary.draws} />
        <RecordValue label="Losses" value={summary.losses} />
      </div>
      {total > 0 && (
        <div aria-hidden="true" className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted">
          <span className="bg-chart-3" style={{ width: `${(wins / total) * 100}%` }} />
          <span className="bg-chart-4" style={{ width: `${(draws / total) * 100}%` }} />
          <span className="bg-chart-5" style={{ width: `${(losses / total) * 100}%` }} />
        </div>
      )}
    </section>
  )
}

function RecordValue({ label, value }: { label: string; value: number | null }): React.JSX.Element {
  return (
    <div>
      <p className="font-mono text-2xl font-semibold tabular-nums">{formatNumber(value) ?? '–'}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function StatisticList({
  rows,
  title
}: {
  rows: Array<{ label: string; value: string | null }>
  title: string
}): React.JSX.Element {
  const visibleRows = rows.filter(({ value }) => value !== null)
  if (visibleRows.length === 0) return <></>

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="border-b px-5 py-3.5">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <dl className="divide-y">
        {visibleRows.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-mono font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function StatisticsEmpty(): React.JSX.Element {
  return (
    <Card>
      <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
        <BarChart3 className="size-6" />
        <p className="font-medium text-foreground">Stats not available</p>
      </CardContent>
    </Card>
  )
}

function StatisticsSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-6 w-16" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="rounded-xl border bg-card p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-8 w-14" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {[0, 1].map((item) => (
          <Skeleton key={item} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

function formatNumber(value: number | null): string | null {
  return value === null ? null : new Intl.NumberFormat().format(value)
}

function formatDecimal(value: number | null): string | null {
  return value === null
    ? null
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)
}

function hasValues(summary: object): boolean {
  return Object.values(summary).some((value) => value !== null)
}
