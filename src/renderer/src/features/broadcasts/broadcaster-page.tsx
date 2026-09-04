import { useMemo } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, RefreshCw, Tv } from 'lucide-react'
import type { RefreshBroadcastScheduleInput } from '@shared/contracts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProviderImage } from '@/components/provider-image'
import { ErrorAlert } from '@/components/error-alert'
import { EntitySubpageNavigation } from '@/components/entity-subpage-navigation'
import { entitySubpageNavigationItemClassName } from '@/components/entity-subpage-navigation-variants'
import { EntityFixtureRow } from '@/features/fixtures/entity-fixture-panel'
import { useOnline } from '@/lib/use-online'
import { useBroadcaster } from './use-broadcaster'
import { useBroadcastSchedule } from './use-broadcast-schedule'

export function BroadcasterPage({
  stationId,
  feed = 'upcoming',
  page = 1,
  fixture,
  competition,
  season
}: {
  stationId: number
  feed?: RefreshBroadcastScheduleInput['feed']
  page?: number
  fixture?: number
  competition?: number
  season?: number
}): React.JSX.Element {
  const online = useOnline()
  const navigate = useNavigate({ from: '/broadcasters/$stationId' })
  const broadcaster = useBroadcaster(stationId, online)
  const input = useMemo(() => ({ stationId, feed, page }), [stationId, feed, page])
  const schedule = useBroadcastSchedule(input, online)
  const station = broadcaster.cached?.station
  const website = station?.url?.startsWith('https://') ? station.url : null
  const fixtures = schedule.cached?.fixtures ?? []

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-7 lg:p-10">
      {fixture && (
        <Link
          to="/fixtures/$fixtureId/preview"
          params={{ fixtureId: String(fixture) }}
          search={{ competition, season }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to match
        </Link>
      )}
      <header className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <ProviderImage
            imagePath={station?.image_path ?? null}
            online={online}
            className="size-14 shrink-0 rounded-lg bg-white p-2"
            imageClassName="size-full object-contain"
            fallback={<Tv className="size-6 text-muted-foreground" />}
          />
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-semibold tracking-tight">
              {station?.name ?? 'Broadcaster'}
            </h1>
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                Website
                <ArrowUpRight className="size-3" />
              </a>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Refresh broadcasts"
          disabled={!online || broadcaster.refreshing || schedule.refreshing}
          onClick={() => void Promise.all([broadcaster.refresh(), schedule.refresh()])}
        >
          <RefreshCw className="size-4" />
        </Button>
      </header>
      <EntitySubpageNavigation aria-label="Broadcast schedule" className="border-b">
        {(['upcoming', 'past'] as const).map((value) => (
          <Link
            key={value}
            to="/broadcasters/$stationId"
            params={{ stationId: String(stationId) }}
            search={{ feed: value, fixture, competition, season }}
            aria-current={feed === value ? 'page' : undefined}
            className={entitySubpageNavigationItemClassName(feed === value)}
          >
            {value === 'upcoming' ? 'Upcoming' : 'Past'}
          </Link>
        ))}
      </EntitySubpageNavigation>
      {broadcaster.error && <ErrorAlert>{broadcaster.error}</ErrorAlert>}
      {schedule.error && <ErrorAlert>{schedule.error}</ErrorAlert>}
      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between gap-3 border-b">
          <CardTitle>{feed === 'upcoming' ? 'Upcoming broadcasts' : 'Past broadcasts'}</CardTitle>
          <span className="text-xs text-muted-foreground">
            Page <span className="font-mono tabular-nums">{page}</span>
          </span>
        </CardHeader>
        {!fixtures.length ? (
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {!schedule.cached
              ? !online
                ? 'Broadcast schedule not available offline'
                : schedule.error
                  ? 'Broadcast schedule unavailable'
                  : 'Loading broadcasts…'
              : 'No broadcasts on this page'}
          </CardContent>
        ) : (
          <div className="divide-y">
            {fixtures.map((match) => {
              const listings = schedule.cached!.listings.filter(
                (listing) => listing.fixture_id === match.id
              )
              const countries = [
                ...new Set(
                  listings.map((listing) => listing.country?.name ?? 'Region not specified')
                )
              ].sort()
              return (
                <div key={match.id}>
                  <EntityFixtureRow
                    fixture={match}
                    context={{ competition: match.leagueId, season: match.seasonId }}
                    online={online}
                    dateDisplay={feed === 'past' ? 'historical' : 'full'}
                    fixtureSeasonLinks
                    showCompetition
                  />
                  <p className="px-4 pb-3 text-xs text-muted-foreground">
                    <span className="font-medium">Broadcast regions</span> ·{' '}
                    {countries.length ? countries.join(', ') : 'Not reported'}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </Card>
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => void navigate({ search: (previous) => ({ ...previous, page: page - 1 }) })}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <p className="text-xs text-muted-foreground">
          {!online && schedule.cached ? 'Saved schedule · ' : ''}
          {fixtures.length} broadcasts on this page
        </p>
        <Button
          variant="outline"
          disabled={!schedule.cached?.hasMore}
          onClick={() => void navigate({ search: (previous) => ({ ...previous, page: page + 1 }) })}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
