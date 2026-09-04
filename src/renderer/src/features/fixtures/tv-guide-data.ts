import type { SportmonksTvListing } from '@shared/contracts'

export interface TvGuideStation {
  id: number
  name: string
  imagePath: string | null
  countries: string[]
}

export function tvGuideStations(
  listings: SportmonksTvListing[],
  countryId: string
): TvGuideStation[] {
  const stations = new Map<number, TvGuideStation>()
  for (const listing of listings) {
    if (countryId !== 'all' && String(listing.country_id) !== countryId) continue
    const station = stations.get(listing.tvstation_id) ?? {
      id: listing.tvstation_id,
      name: listing.tvstation?.name ?? 'Unknown broadcaster',
      imagePath: listing.tvstation?.image_path ?? null,
      countries: []
    }
    const country = listing.country?.name ?? 'Region not specified'
    if (!station.countries.includes(country)) station.countries.push(country)
    stations.set(station.id, station)
  }
  return [...stations.values()]
    .map((station) => ({ ...station, countries: station.countries.sort() }))
    .sort((left, right) => left.name.localeCompare(right.name))
}
