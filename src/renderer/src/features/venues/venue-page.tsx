import { Link } from '@tanstack/react-router'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { ArrowLeft, RefreshCw, Users } from 'lucide-react'
import type { SportmonksVenue } from '@shared/contracts'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/error-alert'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { readVenueTeams } from '@/data/db'
import { TeamLogo } from '@/features/teams/team-logo'
import { prefetchTeamEntity } from '@/features/teams/use-team'
import { useOnline } from '@/lib/use-online'
import { intentPrefetchProps } from '@/lib/prefetch'
import { cn } from '@/lib/utils'
import { useVenueEntity } from './use-venue'
import { VenueImage } from './venue-image'

export function VenuePage({
  competitionId,
  teamId,
  venueId
}: {
  competitionId?: number
  teamId?: number
  venueId: string
}): React.JSX.Element {
  const parsedVenueId = Number(venueId)
  const validVenueId = Number.isSafeInteger(parsedVenueId) && parsedVenueId > 0
  const online = useOnline()
  const venue = useVenueEntity(validVenueId ? parsedVenueId : null, online)
  const teams = useScopedLiveQuery(
    () => (validVenueId ? readVenueTeams(parsedVenueId) : Promise.resolve([])),
    [parsedVenueId, validVenueId]
  )
  const identity = venue.cached?.venue?.raw ?? venue.cached?.summary

  if (!validVenueId) return <MissingVenue />
  if (venue.cached === undefined || teams === undefined || (!identity && online && !venue.error)) {
    return <VenuePageSkeleton />
  }
  if (!identity) {
    return (
      <MissingVenue
        message={online ? (venue.error ?? 'Venue not found.') : 'Venue not available offline.'}
      />
    )
  }

  const detailedVenue = venue.cached.venue?.raw
  const location = [identity.city_name, detailedVenue?.country?.name].filter(Boolean).join(', ')

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 p-7 lg:p-10">
      <div>
        {teamId && (
          <Link
            to="/teams/$teamId"
            params={{ teamId: String(teamId) }}
            search={{ competition: competitionId }}
            className="mb-5 flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            {...intentPrefetchProps(online, () => prefetchTeamEntity(teamId))}
          >
            <ArrowLeft className="size-4" />
            {teams.find(({ id }) => id === teamId)?.name ?? 'Team'}
          </Link>
        )}

        <header className="flex items-center justify-between gap-5">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-semibold tracking-tight">{identity.name}</h1>
            {location && <p className="mt-1 text-sm text-muted-foreground">{location}</p>}
          </div>

          <Button
            aria-label={`Refresh ${identity.name}`}
            disabled={!online || venue.refreshing}
            size="icon"
            variant="outline"
            onClick={() => void venue.refresh()}
          >
            <RefreshCw className={cn('size-4', venue.refreshing && 'animate-spin')} />
          </Button>
        </header>
      </div>

      {venue.error && <ErrorAlert>{venue.error}</ErrorAlert>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-6">
          <VenueDetails venue={identity} />

          <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Teams</h2>
            </div>
            {teams.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
                <Users className="size-6" />
                <p className="text-sm font-medium text-foreground">No teams</p>
              </div>
            ) : (
              <div className="divide-y">
                {teams.map((team) => (
                  <Link
                    key={team.id}
                    to="/teams/$teamId"
                    params={{ teamId: String(team.id) }}
                    search={{ competition: competitionId }}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/45"
                    {...intentPrefetchProps(online, () => prefetchTeamEntity(team.id))}
                  >
                    <TeamLogo
                      className="size-9 bg-background"
                      imagePath={team.imagePath}
                      online={online}
                    />
                    <span className="truncate text-sm font-medium">{team.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <VenueImage
          className="order-first aspect-[4/3] w-full border bg-card shadow-xs lg:order-last"
          imagePath={identity.image_path ?? null}
          online={online}
        />
      </div>
    </div>
  )
}

function VenueDetails({ venue }: { venue: SportmonksVenue }): React.JSX.Element {
  const addressParts = [venue.address, venue.zipcode].filter((part): part is string =>
    Boolean(part)
  )
  if (
    venue.city_name &&
    !addressParts.join(' ').toLocaleLowerCase().includes(venue.city_name.toLocaleLowerCase())
  ) {
    addressParts.push(venue.city_name)
  }
  const address = addressParts.join(', ')
  const details = [
    venue.capacity
      ? { label: 'Capacity', value: new Intl.NumberFormat().format(venue.capacity) }
      : null,
    venue.surface ? { label: 'Surface', value: titleCase(venue.surface) } : null,
    address ? { label: 'Address', value: address } : null,
    venue.national_team ? { label: 'Use', value: 'National team venue' } : null
  ].filter((detail): detail is { label: string; value: string } => detail !== null)

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Details</h2>
      </div>
      {details.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center px-4 text-sm text-muted-foreground">
          No details
        </div>
      ) : (
        <dl className="divide-y">
          {details.map(({ label, value }) => (
            <div key={label} className="grid grid-cols-[7rem_1fr] gap-4 px-4 py-3.5 text-sm">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function MissingVenue({ message = 'Venue not found.' }: { message?: string }): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl p-10">
      <Card>
        <CardContent className="p-6">
          <p className="font-medium">{message}</p>
          <Link to="/competitions" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>
            Competitions
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

function VenuePageSkeleton(): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 p-7 lg:p-10">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-6">
          {[0, 1].map((panel) => (
            <div key={panel} className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b p-4">
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="space-y-4 p-4">
                {[0, 1, 2].map((row) => (
                  <Skeleton key={row} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="order-first aspect-[4/3] w-full rounded-xl lg:order-last" />
      </div>
    </div>
  )
}
