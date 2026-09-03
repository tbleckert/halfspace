import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, RefreshCw, Tv } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { ProviderImage } from '@/components/provider-image'
import { ErrorAlert } from '@/components/error-alert'
import { useSubscription } from '@/features/subscription/use-subscription'
import { featureAccess } from '@/features/subscription/subscription-access'
import { FixtureEmptyState } from './fixture-empty-state'
import { useFixtureTv } from './use-fixture-tv'
import { tvGuideStations } from './tv-guide-data'

export function FixtureTv({
  fixtureId,
  online
}: {
  fixtureId: number
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
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>TV guide</CardTitle>
        <div className="flex items-center gap-2">
          {countries.length > 0 && (
            <NativeSelect
              aria-label="Broadcast country"
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
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <FixtureEmptyState>
            {!online
              ? 'TV listings not available offline.'
              : guide.error
                ? 'TV listings unavailable.'
                : 'Loading TV listings…'}
          </FixtureEmptyState>
        )}
        {guide.cached && stations.length === 0 && (
          <FixtureEmptyState>
            {countryId === 'all'
              ? 'No broadcasts listed for this fixture.'
              : 'No broadcasts listed in this country.'}
          </FixtureEmptyState>
        )}
        {stations.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {stations.map((station) => {
              const content = (
                <>
                  <ProviderImage
                    className="size-12 shrink-0 rounded bg-white p-2"
                    fallback={<Tv className="size-5" />}
                    imageClassName="size-full object-contain"
                    imagePath={station.imagePath}
                    online={online}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{station.name}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {station.countries.join(', ')}
                    </span>
                  </span>
                  {station.url && (
                    <ArrowUpRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                  )}
                </>
              )
              const className = 'flex items-start gap-3 rounded-md border p-3'
              return station.url ? (
                <a
                  key={station.id}
                  className={`${className} hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring`}
                  href={station.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {content}
                </a>
              ) : (
                <div key={station.id} className={className}>
                  {content}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
