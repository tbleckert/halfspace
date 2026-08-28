import { Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import type { SportmonksVenue } from '@shared/contracts'
import { readVenueIdentity } from '@/data/db'
import { VenueImage } from './venue-image'

export function VenueCard({
  competitionId,
  countryName,
  online,
  teamId,
  venueId,
  venueSummary
}: {
  competitionId?: number
  countryName?: string
  online: boolean
  teamId?: number
  venueId: number
  venueSummary: SportmonksVenue
}): React.JSX.Element {
  const cached = useLiveQuery(() => readVenueIdentity(venueId), [venueId])
  const venue = cached?.venue?.raw ?? cached?.summary ?? venueSummary
  const location = [venue.city_name, venue.country?.name ?? countryName].filter(Boolean).join(', ')
  const capacity = venue.capacity ? new Intl.NumberFormat().format(venue.capacity) : null

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Venue</h2>
      </div>
      <Link
        to="/venues/$venueId"
        params={{ venueId: String(venueId) }}
        search={{ competition: competitionId, team: teamId }}
        className="group block outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <VenueImage
          className="aspect-[4/3] w-full rounded-none border-b bg-background"
          imagePath={venue.image_path ?? null}
          online={online}
        />
        <div className="px-4 py-3.5">
          <p className="truncate text-sm font-semibold group-hover:text-primary">{venue.name}</p>
          {(location || capacity) && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {[location, capacity ? `${capacity} seats` : null].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </Link>
    </section>
  )
}
