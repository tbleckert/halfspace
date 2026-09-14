import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import type { ViewBlock, FixtureSourceBlock } from '@shared/views'
import type { CachedFixture } from '@/data/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useOnline } from '@/lib/use-online'
import { useCurrentTime } from '@/lib/use-current-time'
import { useTodayInTimeZone } from '@/lib/use-today'
import { currentTimeZone } from '@/lib/date'
import { useTeamEntity, useTeamFixtures } from '@/features/teams/use-team'
import { BlockPending, BlockError } from './view-block-state'
import { selectTeamViewFixtures, teamViewFixtureInput } from './team-view-data'
import { useMarketShortlist } from './use-market-shortlist'
import { viewBlockLabel } from './view-editing'

export function LinkedMatchView({
  block,
  source,
  children
}: {
  block: Extract<ViewBlock, { fixtureSourceBlockId: string }>
  source: FixtureSourceBlock
  children: (fixture: CachedFixture, online: boolean, date: string) => React.ReactNode
}): React.JSX.Element {
  return source.type === 'market-shortlist' ? (
    <ShortlistMatchView block={block} source={source}>
      {children}
    </ShortlistMatchView>
  ) : (
    <NextMatchView block={block} source={source}>
      {children}
    </NextMatchView>
  )
}

function NextMatchView({
  block,
  source,
  children
}: {
  block: Extract<ViewBlock, { fixtureSourceBlockId: string }>
  source: Extract<FixtureSourceBlock, { type: 'team-next-match' }>
  children: (fixture: CachedFixture, online: boolean, date: string) => React.ReactNode
}): React.JSX.Element {
  const online = useOnline()
  const identity = useTeamEntity(source.teamId, online)
  const team = identity.cached?.team ?? identity.cached?.participant
  const timeZone = useMemo(() => currentTimeZone(), [])
  const today = useTodayInTimeZone(timeZone)
  const input = useMemo(
    () => teamViewFixtureInput(source.teamId, today, timeZone),
    [source.teamId, today, timeZone]
  )
  const query = useTeamFixtures(input, online)
  const now = useCurrentTime()
  const fixture = selectTeamViewFixtures(
    query.cached?.fixtures ?? [],
    source.teamId,
    'upcoming',
    now
  )[0]
  return (
    <div className="space-y-2">
      <Link
        to="/teams/$teamId"
        params={{ teamId: String(source.teamId) }}
        search={{ date: today }}
        className="flex w-fit max-w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
      >
        <span className="truncate">{team?.name ?? `Team ${source.teamId}`} · Next match</span>
        <ArrowUpRight className="size-3 shrink-0" />
      </Link>
      <BlockError error={query.error} online={online} refresh={query.refresh} />
      {!query.cached?.query ? (
        <BlockPending
          block={block}
          online={online}
          error={query.error}
          loading={query.refreshing || query.cached === undefined}
        />
      ) : fixture ? (
        children(fixture, online, today)
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{viewBlockLabel(block)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No scheduled match reported in the next 30 days.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ShortlistMatchView({
  block,
  source,
  children
}: {
  block: Extract<ViewBlock, { fixtureSourceBlockId: string }>
  source: Extract<FixtureSourceBlock, { type: 'market-shortlist' }>
  children: (fixture: CachedFixture, online: boolean, date: string) => React.ReactNode
}): React.JSX.Element {
  const online = useOnline()
  const { query, selected, today } = useMarketShortlist(source, online)
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Market shortlist · Selected match</p>
      <BlockError error={query.error} online={online} refresh={query.refresh} />
      {!query.cached?.query ? (
        <BlockPending
          block={block}
          online={online}
          error={query.error}
          loading={query.refreshing || query.cached === undefined}
        />
      ) : selected ? (
        children(selected, online, today)
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{viewBlockLabel(block)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {source.selectedFixtureId !== null
              ? 'Selected match is outside this window or no longer scheduled. Choose a match in the shortlist.'
              : 'No scheduled match in this shortlist.'}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
