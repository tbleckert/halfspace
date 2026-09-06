import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { ErrorAlert } from '@/components/error-alert'
import { TvGuideFixtureRow } from './tv-guide-fixture-row'
import { WeekNavigator } from '@/components/week-navigator'
import { matchdayWindow } from '@/features/fixtures/matchday-hub'
import { useSubscription } from '@/features/subscription/use-subscription'
import { featureAccess } from '@/features/subscription/subscription-access'
import { currentTimeZone } from '@/lib/date'
import { useTodayInTimeZone } from '@/lib/use-today'
import { useOnline } from '@/lib/use-online'
import { useTvGuide } from './use-tv-guide'
import { watchableFixtures } from './tv-guide-data'

const preferenceKey = 'halfspace:tv-country'

export function TvGuidePage({ date: selectedDate }: { date?: string }): React.JSX.Element {
  const navigate = useNavigate({ from: '/tv-guide' })
  const online = useOnline()
  const timeZone = currentTimeZone()
  const today = useTodayInTimeZone(timeZone)
  const date = selectedDate ?? today
  const navigationDates = matchdayWindow(date).navigationDates
  const input = useMemo(
    () => ({
      startDate: date,
      endDate: date,
      timeZone
    }),
    [date, timeZone]
  )
  const [country, setCountry] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(preferenceKey) ?? 'null') as {
        id: string
        name: string
      } | null
    } catch {
      return null
    }
  })
  const subscription = useSubscription(online)
  const access = featureAccess(subscription.cached, 'tv')
  const guide = useTvGuide(input, online && access !== 'not-included')
  const countries = new Map<string, string>()
  if (country) countries.set(country.id, country.name)
  for (const listing of guide.cached?.listings ?? []) {
    if (listing.country) countries.set(String(listing.country.id), listing.country.name)
  }
  const entries = watchableFixtures(
    guide.cached?.fixtures ?? [],
    guide.cached?.listings ?? [],
    country?.id ?? '',
    date,
    timeZone
  )
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-5 lg:p-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">TV Guide</h1>
        <div className="flex min-w-0 items-center gap-2">
          <NativeSelect
            aria-label="Broadcast country"
            value={country?.id ?? ''}
            className="max-w-56"
            onChange={(event) => {
              const id = event.target.value
              const selected = id ? { id, name: countries.get(id)! } : null
              setCountry(selected)
              localStorage.setItem(preferenceKey, JSON.stringify(selected))
            }}
          >
            <option value="">Choose country</option>
            {[...countries]
              .sort((a, b) => a[1].localeCompare(b[1]))
              .map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
          </NativeSelect>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh TV guide"
            disabled={!online || guide.refreshing || subscription.refreshing}
            onClick={() => void Promise.all([subscription.refresh(), guide.refresh()])}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <WeekNavigator
          label="TV Guide week"
          date={date}
          navigationDates={navigationDates}
          onSelect={(nextDate) => void navigate({ search: { date: nextDate } })}
        />
        {date !== today && (
          <Button variant="ghost" onClick={() => void navigate({ search: {} })}>
            Today
          </Button>
        )}
      </div>
      {!online && guide.cached && <p className="text-sm text-muted-foreground">Saved listings</p>}
      {guide.error && <ErrorAlert>{guide.error}</ErrorAlert>}
      {access === 'not-included' ? (
        <ErrorAlert>
          TV listings are not included in your Sportmonks plan.{' '}
          <Link to="/settings" className="underline">
            View subscription
          </Link>
        </ErrorAlert>
      ) : (
        <Card>
          <CardContent className="p-3">
            {!guide.cached ? (
              <p className="p-5 text-sm text-muted-foreground">
                {!online
                  ? 'TV guide not available offline.'
                  : guide.error
                    ? 'TV guide unavailable.'
                    : 'Loading TV listings…'}
              </p>
            ) : !country ? (
              <p className="p-5 text-sm text-muted-foreground">
                {countries.size
                  ? 'Choose a country to see what’s on.'
                  : 'No broadcasts listed for this day.'}
              </p>
            ) : !entries.length ? (
              <p className="p-5 text-sm text-muted-foreground">
                No remaining broadcasts listed in {country.name} for this day.
              </p>
            ) : (
              <ul className="space-y-4" aria-label="Daily TV listings">
                {entries.map(({ fixture, stations }) => (
                  <li key={fixture.id}>
                    <TvGuideFixtureRow fixture={fixture} online={online} date={date} />
                    <div className="flex flex-wrap gap-x-4 gap-y-2 pl-24 pr-3 pb-3">
                      {stations.map((station) => (
                        <Link
                          key={station.id}
                          to="/broadcasters/$stationId"
                          params={{ stationId: String(station.id) }}
                          search={{
                            fixture: fixture.id,
                            competition: fixture.leagueId,
                            season: fixture.seasonId
                          }}
                          className="text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          {station.name}
                        </Link>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
