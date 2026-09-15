import { Link } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import type { FixtureSourceBlock, BroadcastViewBlock, ViewBlock } from '@shared/views'
import type { CachedFixture } from '@/data/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { formatFixtureTime } from '@/lib/date'
import { useFixtureTv } from '@/features/fixtures/use-fixture-tv'
import { FixtureTvStations } from '@/features/fixtures/fixture-tv-stations'
import { tvGuideStations } from '@/features/fixtures/tv-guide-data'
import { useTvCountry } from '@/features/broadcasts/use-tv-country'
import { useSubscription } from '@/features/subscription/use-subscription'
import { featureAccess } from '@/features/subscription/subscription-access'
import { BlockError } from './view-block-state'
import { LinkedMatchView } from './linked-match-view'
import { viewBroadcastCountries } from './view-broadcast-countries'

export function BroadcastViewBlockContent({
  block,
  source,
  onChange
}: {
  block: BroadcastViewBlock
  source: FixtureSourceBlock
  onChange: (block: ViewBlock) => void
}): React.JSX.Element {
  return (
    <LinkedMatchView block={block} source={source}>
      {(fixture, online, date) => (
        <BroadcastListings
          key={fixture.id}
          block={block}
          fixture={fixture}
          teamId={source.type === 'team-next-match' ? source.teamId : undefined}
          date={date}
          online={online}
          onChange={onChange}
        />
      )}
    </LinkedMatchView>
  )
}

function BroadcastListings({
  block,
  fixture,
  teamId,
  date,
  online,
  onChange
}: {
  block: BroadcastViewBlock
  fixture: CachedFixture
  teamId: number | undefined
  date: string
  online: boolean
  onChange: (block: ViewBlock) => void
}): React.JSX.Element {
  const { country: preferredCountry } = useTvCountry()
  const subscription = useSubscription(online)
  const access = featureAccess(subscription.cached, 'tv')
  const guide = useFixtureTv(fixture.id, online && access !== 'not-included')
  const countries = viewBroadcastCountries(
    (guide.cached?.listings ?? []).flatMap(({ country }) =>
      country ? [{ countryId: country.id, countryName: country.name }] : []
    ),
    preferredCountry,
    [block]
  )
  const selectedCountry =
    block.countryId === 'preferred' ? (preferredCountry?.id ?? 'all') : String(block.countryId)
  const stations = tvGuideStations(guide.cached?.listings ?? [], selectedCountry)
  const countryName =
    countries.find((country) => String(country.countryId) === selectedCountry)?.countryName ??
    `Country ${selectedCountry}`
  const countryOptions = [
    {
      value: 'preferred',
      label: preferredCountry ? `Preferred · ${preferredCountry.name}` : 'Preferred · All countries'
    },
    { value: 'all', label: 'All countries' },
    ...countries.map((country) => ({
      value: String(country.countryId),
      label: country.countryName
    }))
  ]
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>Where to watch</CardTitle>
        <Button
          aria-label="Refresh broadcasts"
          variant="ghost"
          size="icon"
          disabled={!online || guide.refreshing || subscription.refreshing}
          onClick={async () => {
            await subscription.refresh()
            await guide.refresh()
          }}
        >
          <RefreshCw className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 @min-[520px]/view-widget:grid-cols-[minmax(0,1fr)_minmax(0,200px)] @min-[520px]/view-widget:items-center">
          <Link
            to="/fixtures/$fixtureId"
            params={{ fixtureId: String(fixture.id) }}
            search={{ team: teamId, date, competition: fixture.leagueId, season: fixture.seasonId }}
            className="min-w-0 rounded-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            <p className="text-sm font-medium wrap-anywhere">{fixture.name ?? 'Next match'}</p>
            <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
              {fixture.startingAt === null
                ? 'Time unavailable'
                : new Intl.DateTimeFormat(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  }).format(fixture.startingAt) +
                  ' · ' +
                  formatFixtureTime(fixture.startingAt)}
            </p>
          </Link>
          <Select
            items={countryOptions}
            value={String(String(block.countryId))}
            onValueChange={(value) => {
              if (value === null) return
              onChange({
                ...block,
                countryId: value === 'all' || value === 'preferred' ? value : Number(value)
              })
            }}
          >
            <SelectTrigger aria-label="Broadcast country" className="w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {countryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <BlockError error={guide.error} online={online} refresh={guide.refresh} />
        {access === 'not-included' && (
          <p className="text-sm text-muted-foreground">
            TV listings are not included in your Sportmonks plan.{' '}
            <Link to="/settings" className="text-foreground underline underline-offset-4">
              View subscription
            </Link>
          </p>
        )}
        {!guide.cached && access !== 'not-included' && (
          <p role="status" className="text-sm text-muted-foreground">
            {!online
              ? 'TV listings not cached for offline use.'
              : guide.error
                ? 'TV listings unavailable.'
                : 'Loading TV listings…'}
          </p>
        )}
        {guide.cached && !stations.length && (
          <p className="text-sm text-muted-foreground">
            {selectedCountry === 'all'
              ? 'No broadcasts listed for this fixture.'
              : `No broadcasts listed in ${countryName} for this fixture.`}
          </p>
        )}
        {stations.length > 0 && (
          <FixtureTvStations
            stations={stations}
            fixtureId={fixture.id}
            competitionId={fixture.leagueId}
            seasonId={fixture.seasonId ?? undefined}
            online={online}
            showCountries={selectedCountry === 'all'}
            className="@min-[520px]/view-widget:grid-cols-2 @min-[860px]/view-widget:grid-cols-3"
          />
        )}
      </CardContent>
    </Card>
  )
}
