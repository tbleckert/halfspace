import { Link } from '@tanstack/react-router'
import type { SportmonksParticipant } from '@shared/contracts'
import { Skeleton } from '@/components/ui/skeleton'
import type { CachedFixture, CachedStanding } from '@/data/db'
import { TeamLogo } from '@/features/teams/team-logo'
import { intentPrefetchProps } from '@/lib/prefetch'
import { cn } from '@/lib/utils'
import { currentFixtureScore, fixtureParticipantAt } from '@/lib/fixture'
import { EntityFixturePanel } from './entity-fixture-panel'
import {
  fixtureOutcome,
  recentHeadToHead,
  recentTeamFixtures,
  standingForParticipant,
  type FixtureOutcome
} from './fixture-preview-data'
import type { FixtureDetailSearch } from './fixture-route'
import { useFixturePreview, type FixturePreviewInput } from './use-fixture-preview'
import { prefetchFixtureEntity } from './use-fixtures'

export function FixturePreviewWorkspace({
  context,
  fixture,
  input,
  online
}: {
  context: FixtureDetailSearch
  fixture: CachedFixture
  input: FixturePreviewInput | null
  online: boolean
}): React.JSX.Element | null {
  const preview = useFixturePreview(input, online)
  if (!input) return null

  const home = fixtureParticipantAt(fixture.raw, 'home')
  const away = fixtureParticipantAt(fixture.raw, 'away')
  if (!home || !away) return null

  const standings = preview.standings.cached?.standings ?? []
  const homeFixtures = recentTeamFixtures(
    preview.homeFixtures.cached?.fixtures ?? [],
    home.id,
    input.fixtureId,
    input.startingAt
  )
  const awayFixtures = recentTeamFixtures(
    preview.awayFixtures.cached?.fixtures ?? [],
    away.id,
    input.fixtureId,
    input.startingAt
  )
  const meetings = recentHeadToHead(
    preview.headToHead.cached?.fixtures ?? [],
    input.fixtureId,
    input.startingAt
  )

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <FixtureTable
        away={away}
        awayStanding={standingForParticipant(standings, away.id)}
        home={home}
        homeStanding={standingForParticipant(standings, home.id)}
        loading={
          preview.standings.cached === undefined ||
          (preview.standings.refreshing && preview.standings.cached.standings.length === 0)
        }
        online={online}
      />
      <FixtureForm
        away={away}
        awayFixtures={awayFixtures}
        context={context}
        home={home}
        homeFixtures={homeFixtures}
        loading={
          preview.homeFixtures.cached === undefined ||
          preview.awayFixtures.cached === undefined ||
          (preview.homeFixtures.refreshing && preview.homeFixtures.cached.fixtures.length === 0) ||
          (preview.awayFixtures.refreshing && preview.awayFixtures.cached.fixtures.length === 0)
        }
        online={online}
      />
      <EntityFixturePanel
        context={context}
        dateDisplay="historical"
        emptyLabel={preview.headToHead.error ?? 'No previous meetings'}
        fixtures={meetings}
        fixtureSeasonLinks
        label="Previous meetings"
        loading={
          preview.headToHead.cached === undefined ||
          (preview.headToHead.refreshing && preview.headToHead.cached.fixtures.length === 0)
        }
        online={online}
        showCompetition
      />
    </div>
  )
}

function FixtureTable({
  away,
  awayStanding,
  home,
  homeStanding,
  loading,
  online
}: {
  away: SportmonksParticipant
  awayStanding: CachedStanding | null
  home: SportmonksParticipant
  homeStanding: CachedStanding | null
  loading: boolean
  online: boolean
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Table</h2>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 divide-x p-5">
          <StandingSkeleton />
          <StandingSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 divide-x">
          <TeamStanding participant={home} standing={homeStanding} online={online} />
          <TeamStanding participant={away} standing={awayStanding} online={online} />
        </div>
      )}
    </section>
  )
}

function TeamStanding({
  participant,
  standing,
  online
}: {
  participant: SportmonksParticipant
  standing: CachedStanding | null
  online: boolean
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 px-4 py-5 sm:px-5">
      <TeamLogo
        className="size-10 shrink-0 bg-background"
        imagePath={participant.image_path ?? null}
        online={online}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{participant.name}</p>
        <p
          className={cn('mt-1 text-sm text-muted-foreground', standing && 'font-mono tabular-nums')}
        >
          {standing ? `#${standing.position} · ${standing.raw.points} pts` : 'Not in table'}
        </p>
      </div>
    </div>
  )
}

function StandingSkeleton(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 px-3">
      <Skeleton className="size-10 rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

function FixtureForm({
  away,
  awayFixtures,
  context,
  home,
  homeFixtures,
  loading,
  online
}: {
  away: SportmonksParticipant
  awayFixtures: CachedFixture[]
  context: FixtureDetailSearch
  home: SportmonksParticipant
  homeFixtures: CachedFixture[]
  loading: boolean
  online: boolean
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Form</h2>
      </div>
      <div className="grid sm:grid-cols-2 sm:divide-x">
        <TeamForm
          context={context}
          fixtures={homeFixtures}
          loading={loading}
          online={online}
          participant={home}
        />
        <TeamForm
          className="border-t sm:border-t-0"
          context={context}
          fixtures={awayFixtures}
          loading={loading}
          online={online}
          participant={away}
        />
      </div>
    </section>
  )
}

function TeamForm({
  className,
  context,
  fixtures,
  loading,
  online,
  participant
}: {
  className?: string
  context: FixtureDetailSearch
  fixtures: CachedFixture[]
  loading: boolean
  online: boolean
  participant: SportmonksParticipant
}): React.JSX.Element {
  return (
    <div className={className}>
      <div className="flex items-center gap-3 border-b px-4 py-3.5">
        <TeamLogo
          className="size-8 bg-background"
          imagePath={participant.image_path ?? null}
          online={online}
        />
        <p className="min-w-0 truncate text-sm font-semibold">{participant.name}</p>
        {fixtures.length > 0 && (
          <div className="ml-auto flex gap-1" aria-label={`${participant.name} recent form`}>
            {fixtures.map((fixture) => {
              const outcome = fixtureOutcome(fixture, participant.id)
              return outcome ? <Outcome key={fixture.id} outcome={outcome} /> : null
            })}
          </div>
        )}
      </div>
      {loading ? (
        <div className="space-y-3 px-4 py-4">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-6 w-full" />
          ))}
        </div>
      ) : fixtures.length === 0 ? (
        <div className="flex min-h-32 items-center justify-center px-4 text-sm text-muted-foreground">
          No recent form
        </div>
      ) : (
        <div className="divide-y">
          {fixtures.map((fixture) => (
            <FormFixtureRow
              key={fixture.id}
              context={context}
              fixture={fixture}
              online={online}
              teamId={participant.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FormFixtureRow({
  context,
  fixture,
  online,
  teamId
}: {
  context: FixtureDetailSearch
  fixture: CachedFixture
  online: boolean
  teamId: number
}): React.JSX.Element {
  const opponent = fixture.raw.participants.find(({ id }) => id !== teamId)
  const outcome = fixtureOutcome(fixture, teamId)

  return (
    <Link
      to="/fixtures/$fixtureId"
      params={{ fixtureId: String(fixture.id) }}
      search={context}
      className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2.5 px-4 py-3 text-sm hover:bg-muted/45"
      {...intentPrefetchProps(online, () => prefetchFixtureEntity(fixture.id))}
    >
      <TeamLogo
        className="size-6 bg-background"
        imagePath={opponent?.image_path ?? null}
        online={online}
      />
      <span className="truncate">{opponent?.name ?? 'Opponent'}</span>
      <span className="font-mono font-semibold tabular-nums">{fixtureScore(fixture)}</span>
      {outcome && <Outcome outcome={outcome} />}
    </Link>
  )
}

function Outcome({ outcome }: { outcome: FixtureOutcome }): React.JSX.Element {
  return (
    <span
      className={cn(
        'flex size-5 items-center justify-center rounded-full font-mono text-[10px] font-bold',
        outcome === 'W' &&
          'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
        outcome === 'D' && 'bg-muted text-muted-foreground',
        outcome === 'L' && 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
      )}
    >
      {outcome}
    </span>
  )
}

function fixtureScore(fixture: CachedFixture): string {
  const { home, away } = currentFixtureScore(fixture.raw)
  return home === undefined || away === undefined ? '–' : `${home}–${away}`
}
