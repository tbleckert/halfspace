import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Card, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TeamLogo } from '@/features/teams/team-logo'
import { usePinnedTeams } from '@/features/teams/use-team-pins'
import { prefetchTeamEntity, teamFixtureInput, useTeamFixtures } from '@/features/teams/use-team'
import { addDaysToIsoDate } from '@/lib/date'
import { intentPrefetchProps } from '@/lib/prefetch'
import { FixtureRow } from './fixture-list'
import { MatchdayCard } from './matchday-card'
import { selectYourTeamFixtures, type YourTeamFixture } from './your-teams-data'

type PinnedTeam = NonNullable<ReturnType<typeof usePinnedTeams>>[number]
type YourTeamsProps = { today: string; timeZone: string; online: boolean }

export function YourTeams(props: YourTeamsProps): React.JSX.Element {
  const teams = usePinnedTeams()

  return (
    <section aria-labelledby="your-teams-title" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="your-teams-title" className="text-lg font-semibold tracking-tight">
          My teams
        </h2>
        <Link
          to="/teams"
          className="rounded-md text-xs font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {teams?.length ? 'Manage teams' : 'Browse teams'}
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {teams === undefined && <TeamCardSkeleton />}
        {teams?.map((team, index) => (
          <YourTeamCard key={team.teamId} team={team} index={index} {...props} />
        ))}
      </div>
    </section>
  )
}

function YourTeamCard({
  team,
  index,
  today,
  timeZone,
  online
}: YourTeamsProps & { team: PinnedTeam; index: number }): React.JSX.Element | null {
  const input = useMemo(
    () => teamFixtureInput(team.teamId, addDaysToIsoDate(today, -30), timeZone),
    [team.teamId, today, timeZone]
  )
  const { cached, refreshing, error } = useTeamFixtures(input, online)
  const { upcoming, previous } = selectYourTeamFixtures(
    cached?.fixtures ?? [],
    team.teamId,
    today,
    timeZone
  )

  if (!cached || (!cached.query && online && !error)) return <TeamCardSkeleton />
  if (!upcoming && !previous) {
    if (!cached.query)
      return (
        <p role="status" className="text-xs text-muted-foreground">
          {team.name}: {error ?? 'Fixtures aren’t cached.'}
        </p>
      )
    return null
  }

  return (
    <MatchdayCard index={index} className="overflow-hidden">
      <CardHeader className="px-5 pb-3 pt-5">
        <Link
          to="/teams/$teamId"
          params={{ teamId: String(team.teamId) }}
          search={{ date: today }}
          className="flex w-fit min-w-0 items-center gap-2.5 rounded-md outline-none transition-colors hover:text-sidebar-primary focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          {...intentPrefetchProps(online, () => prefetchTeamEntity(team.teamId))}
        >
          <TeamLogo className="size-7 shrink-0" imagePath={team.imagePath} online={online} />
          <h3 className="min-w-0 text-sm font-semibold">{team.name}</h3>
        </Link>
      </CardHeader>
      <div className="space-y-3 px-2 pb-2">
        {upcoming && <TeamFixture title="Upcoming" entry={upcoming} online={online} />}
        {previous && <TeamFixture title="Previous result" entry={previous} online={online} />}
      </div>
      {error && !refreshing && (
        <p role="status" className="px-5 pb-4 text-xs text-muted-foreground">
          {error}
        </p>
      )}
    </MatchdayCard>
  )
}

function TeamFixture({
  title,
  entry: { fixture, date },
  online
}: {
  title: string
  entry: YourTeamFixture
  online: boolean
}): React.JSX.Element {
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC'
  }).format(new Date(`${date}T12:00:00Z`))
  return (
    <div>
      <h4 className="px-3 text-xs font-semibold text-muted-foreground">{title}</h4>
      <FixtureRow
        fixture={fixture}
        date={date}
        online={online}
        context={[formattedDate, fixture.raw.league?.name].filter(Boolean).join(' · ')}
      />
    </div>
  )
}

function TeamCardSkeleton(): React.JSX.Element {
  return (
    <Card role="status" aria-label="Loading team fixtures" className="space-y-5 p-5">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </Card>
  )
}
