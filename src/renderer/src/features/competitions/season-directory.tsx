import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { readSeasonReferees, readSeasonVenues } from '@/data/season-resources-cache'
import { PlayerPhoto } from '@/features/players/player-photo'
import { prefetchRefereeEntity } from '@/features/referees/use-referee'
import { VenueImage } from '@/features/venues/venue-image'
import { prefetchVenueEntity } from '@/features/venues/use-venue'
import { intentPrefetchProps } from '@/lib/prefetch'

interface DirectoryProps {
  competitionId: number
  seasonId: number | null
  date: string
  online: boolean
  loading: boolean
}

export function SeasonReferees({
  cached,
  competitionId,
  seasonId,
  date,
  online,
  loading
}: DirectoryProps & {
  cached: Awaited<ReturnType<typeof readSeasonReferees>> | undefined
}): React.JSX.Element {
  const [search, setSearch] = useState('')
  const referees = (cached?.referees ?? [])
    .filter(({ raw }) =>
      `${raw.display_name} ${raw.country?.name ?? ''}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase())
    )
    .toSorted((a, b) => a.raw.display_name.localeCompare(b.raw.display_name))
  return (
    <section aria-label="Season referees" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Referees</h2>
        <Input
          aria-label="Filter referees"
          placeholder="Find a referee"
          className="w-56"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {!referees.length ? (
        <DirectoryEmpty
          available={Boolean(cached)}
          loading={cached === undefined || loading}
          online={online}
          filtered={Boolean(search)}
          subject="referees"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {referees.map(({ raw: referee }) => (
            <Card key={referee.id}>
              <Link
                to="/referees/$refereeId"
                params={{ refereeId: String(referee.id) }}
                search={{
                  competition: competitionId,
                  season: seasonId ?? undefined,
                  statsSeason: seasonId ?? undefined,
                  date
                }}
                className="flex items-center gap-3 rounded-lg p-4 hover:bg-muted/40 focus-visible:outline-ring"
                {...intentPrefetchProps(online, () => prefetchRefereeEntity(referee.id))}
              >
                <PlayerPhoto
                  className="size-12 shrink-0 rounded-full"
                  imagePath={referee.image_path ?? null}
                  online={online}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{referee.display_name}</p>
                  {referee.country?.name && (
                    <p className="mt-1 text-xs text-muted-foreground">{referee.country.name}</p>
                  )}
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

export function SeasonVenues({
  cached,
  competitionId,
  seasonId,
  date,
  online,
  loading
}: DirectoryProps & {
  cached: Awaited<ReturnType<typeof readSeasonVenues>> | undefined
}): React.JSX.Element {
  const [search, setSearch] = useState('')
  const venues = (cached?.venues ?? [])
    .filter(({ raw }) =>
      `${raw.name} ${raw.city_name ?? ''} ${raw.country?.name ?? ''}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase())
    )
    .toSorted((a, b) => a.name.localeCompare(b.name))
  return (
    <section aria-label="Season venues" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Venues</h2>
        <Input
          aria-label="Filter venues"
          placeholder="Find a venue"
          className="w-56"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {!venues.length ? (
        <DirectoryEmpty
          available={Boolean(cached)}
          loading={cached === undefined || loading}
          online={online}
          filtered={Boolean(search)}
          subject="venues"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {venues.map(({ raw: venue }) => (
            <Card key={venue.id}>
              <Link
                to="/venues/$venueId"
                params={{ venueId: String(venue.id) }}
                search={{ competition: competitionId, season: seasonId ?? undefined, date }}
                className="flex items-center gap-4 rounded-lg p-4 hover:bg-muted/40 focus-visible:outline-ring"
                {...intentPrefetchProps(online, () => prefetchVenueEntity(venue.id))}
              >
                <VenueImage
                  className="h-16 w-24 shrink-0 rounded-md"
                  imagePath={venue.image_path ?? null}
                  online={online}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{venue.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[venue.city_name, venue.country?.name].filter(Boolean).join(' · ')}
                  </p>
                  {venue.capacity !== null && venue.capacity !== undefined && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-mono tabular-nums">
                        {venue.capacity.toLocaleString()}
                      </span>{' '}
                      seats
                    </p>
                  )}
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

function DirectoryEmpty({
  available,
  loading,
  online,
  filtered,
  subject
}: {
  available: boolean
  loading: boolean
  online: boolean
  filtered: boolean
  subject: string
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="p-8 text-center text-sm text-muted-foreground">
        {!available
          ? loading
            ? `Loading ${subject}…`
            : online
              ? `${subject === 'venues' ? 'Venues' : 'Referees'} unavailable`
              : `${subject === 'venues' ? 'Venues' : 'Referees'} not available offline`
          : filtered
            ? 'No matches'
            : `No ${subject} reported for this season`}
      </CardContent>
    </Card>
  )
}
