import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRight, RefreshCw, Tv } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { ProviderImage } from '@/components/provider-image'
import { ErrorAlert } from '@/components/error-alert'
import { useSubscription } from '@/features/subscription/use-subscription'
import { featureAccess } from '@/features/subscription/subscription-access'
import { useFixtureTv } from './use-fixture-tv'
import { tvGuideStations } from './tv-guide-data'

export function FixtureTv({
  fixtureId,
  competitionId,
  seasonId,
  online
}: {
  fixtureId: number
  competitionId?: number
  seasonId?: number
  online: boolean
}): React.JSX.Element {
  const [countryId, setCountryId] = useState('all')
  const subscription = useSubscription(online)
  const access = featureAccess(subscription.cached, 'tv')
  const guide = useFixtureTv(fixtureId, online && access !== 'not-included')
  const listings = guide.cached?.listings ?? []
  const countries = [
    ...new Map(
      listings.flatMap((listing) =>
        listing.country ? [[listing.country.id, listing.country] as const] : []
      )
    ).values()
  ].sort((left, right) => left.name.localeCompare(right.name))
  const stations = tvGuideStations(listings, countryId)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>TV guide</CardTitle>
        <Button
          aria-label="Refresh TV guide"
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
      <CardContent className="space-y-3">
        {countries.length > 0 && (
          <NativeSelect
            aria-label="Broadcast country"
            className="w-full"
            value={countryId}
            onChange={(event) => setCountryId(event.target.value)}
          >
            <option value="all">All countries</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </NativeSelect>
        )}
        {guide.error && <ErrorAlert>{guide.error}</ErrorAlert>}
        {access === 'not-included' && (
          <p className="text-sm text-muted-foreground">
            TV listings are not included in your Sportmonks plan.{' '}
            <Link to="/settings" className="text-foreground underline underline-offset-4">
              View subscription
            </Link>
          </p>
        )}
        {!guide.cached && access !== 'not-included' && (
          <p className="text-sm text-muted-foreground">
            {!online
              ? 'TV listings not available offline.'
              : guide.error
                ? 'TV listings unavailable.'
                : 'Loading TV listings…'}
          </p>
        )}
        {guide.cached && stations.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {countryId === 'all'
              ? 'No broadcasts listed for this fixture.'
              : 'No broadcasts listed in this country.'}
          </p>
        )}
        {stations.length > 0 && (
          <div
            role="region"
            aria-label="TV listings"
            tabIndex={0}
            className="max-h-72 overflow-y-auto rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ul className="divide-y">
              {stations.map((station) => {
                const content = (
                  <>
                    <ProviderImage
                      className="size-8 shrink-0 rounded bg-white p-1"
                      fallback={<Tv className="size-4" />}
                      imageClassName="size-full object-contain"
                      imagePath={station.imagePath}
                      online={online}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{station.name}</span>
                      {countryId === 'all' && (
                        <span
                          title={station.countries.join(', ')}
                          className="mt-0.5 line-clamp-2 text-xs text-muted-foreground"
                        >
                          {station.countries.join(', ')}
                        </span>
                      )}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                  </>
                )
                const className = 'flex items-center gap-2 py-2'
                return (
                  <li key={station.id}>
                    <Link
                      to="/broadcasters/$stationId"
                      params={{ stationId: String(station.id) }}
                      search={{ fixture: fixtureId, competition: competitionId, season: seasonId }}
                      className={`${className} hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring`}
                    >
                      {content}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
