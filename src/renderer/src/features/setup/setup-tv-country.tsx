import { useMemo } from 'react'
import { NativeSelect } from '@/components/ui/native-select'
import { ErrorAlert } from '@/components/error-alert'
import { useTvCountry } from '@/features/broadcasts/use-tv-country'
import { useTvGuide } from '@/features/broadcasts/use-tv-guide'
import { useSubscription } from '@/features/subscription/use-subscription'
import { featureAccess } from '@/features/subscription/subscription-access'
import { addDaysToIsoDate, currentTimeZone } from '@/lib/date'
import { useTodayInTimeZone } from '@/lib/use-today'

export function SetupTvCountry({ online }: { online: boolean }): React.JSX.Element {
  const timeZone = currentTimeZone()
  const today = useTodayInTimeZone(timeZone)
  const input = useMemo(
    () => ({ startDate: today, endDate: addDaysToIsoDate(today, 7), timeZone }),
    [today, timeZone]
  )
  const { country, setCountry, error } = useTvCountry()
  const subscription = useSubscription(online)
  const access = featureAccess(subscription.cached, 'tv')
  const guide = useTvGuide(
    input,
    online && access !== 'not-included' && (!!subscription.cached || !!subscription.error)
  )
  const countries = new Map<string, string>()
  if (country) countries.set(country.id, country.name)
  for (const listing of guide.cached?.listings ?? []) {
    if (listing.country) countries.set(String(listing.country.id), listing.country.name)
  }
  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs text-muted-foreground">
        Choose from the countries in this week’s broadcast listings. You can change this in TV
        Guide.
      </p>
      {access === 'not-included' ? (
        <p role="status" className="text-sm text-muted-foreground">
          TV listings aren’t included in your Sportmonks plan.
        </p>
      ) : (
        <>
          {countries.size > 0 && (
            <NativeSelect
              aria-label="Broadcast country"
              value={country?.id ?? ''}
              className="w-full"
              onChange={(event) => {
                const id = event.target.value
                setCountry(id ? { id, name: countries.get(id)! } : null)
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
          )}
          {guide.error ? (
            <ErrorAlert>{guide.error}</ErrorAlert>
          ) : (
            !countries.size && (
              <p role="status" className="text-sm text-muted-foreground">
                {guide.cached
                  ? 'No broadcast countries reported for this week.'
                  : !online
                    ? 'Broadcast countries aren’t available offline yet.'
                    : 'Loading broadcast countries…'}
              </p>
            )
          )}
        </>
      )}
      {error && <ErrorAlert>{error}</ErrorAlert>}
    </div>
  )
}
