import { MapPin } from 'lucide-react'
import type { SportmonksVenue } from '@shared/contracts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { locationMapUrl } from './venue-location-data'

export function VenueLocation({ venue }: { venue: SportmonksVenue }): React.JSX.Element | null {
  const stadiumMap = locationMapUrl(venue.latitude, venue.longitude)
  const cityMap = locationMapUrl(venue.city?.latitude, venue.city?.longitude)
  const location = [venue.city?.name ?? venue.city_name, venue.country?.name]
    .filter(Boolean)
    .join(', ')
  if (!location && !stadiumMap && !cityMap) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Location</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {location && <p className="font-medium">{location}</p>}
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          {[
            [stadiumMap, 'View stadium map'],
            [cityMap, 'View city map']
          ].map(
            ([url, label]) =>
              url && (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-sm text-primary hover:underline focus-visible:outline-ring"
                >
                  <MapPin className="size-3.5" />
                  {label}
                </a>
              )
          )}
        </div>
      </CardContent>
    </Card>
  )
}
