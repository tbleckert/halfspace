import { Link } from '@tanstack/react-router'
import { ChevronRight, Tv } from 'lucide-react'
import { ProviderImage } from '@/components/provider-image'
import { cn } from '@/lib/utils'
import type { TvGuideStation } from './tv-guide-data'

export function FixtureTvStations({
  stations,
  fixtureId,
  competitionId,
  seasonId,
  online,
  showCountries,
  className
}: {
  stations: TvGuideStation[]
  fixtureId: number
  competitionId?: number
  seasonId?: number
  online: boolean
  showCountries: boolean
  className?: string
}): React.JSX.Element {
  return (
    <div
      role="region"
      aria-label="TV listings"
      tabIndex={0}
      className="max-h-72 overflow-y-auto rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ul className={cn('grid gap-2 pb-2', className)}>
        {stations.map((station) => (
          <li key={station.id} className="min-w-0">
            <Link
              to="/broadcasters/$stationId"
              params={{ stationId: String(station.id) }}
              search={{ fixture: fixtureId, competition: competitionId, season: seasonId }}
              className="flex h-full items-center gap-2 rounded-sm py-2 hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring"
            >
              <ProviderImage
                className="size-8 shrink-0 rounded bg-white p-1"
                fallback={<Tv className="size-4" />}
                imageClassName="size-full object-contain"
                imagePath={station.imagePath}
                online={online}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium wrap-anywhere">{station.name}</span>
                {showCountries && (
                  <span
                    title={station.countries.join(', ')}
                    className="mt-0.5 line-clamp-2 text-xs text-muted-foreground"
                  >
                    {station.countries.join(', ')}
                  </span>
                )}
              </span>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
