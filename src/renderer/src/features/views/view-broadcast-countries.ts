import type { ViewCountryContext, ViewBlock } from '@shared/views'
import { db } from '@/data/db'

export async function readViewBroadcastCountries(): Promise<ViewCountryContext[]> {
  const [fixtures, guides] = await Promise.all([
    db.fixtureTvQueries.toArray(),
    db.tvGuideQueries.toArray()
  ])
  const countries = new Map<number, string>()
  for (const query of [...fixtures, ...guides]) {
    for (const listing of query.listings) {
      if (listing.country) countries.set(listing.country.id, listing.country.name)
    }
  }
  return [...countries].map(([countryId, countryName]) => ({ countryId, countryName }))
}

export function viewBroadcastCountries(
  cached: ViewCountryContext[],
  preferred: { id: string; name: string } | null,
  blocks: readonly ViewBlock[]
): ViewCountryContext[] {
  const countries = new Map<number, string>()
  // Saved selections remain known identities after disposable caches are cleared.
  for (const block of blocks) {
    if (block.type === 'fixture-broadcasts' && typeof block.countryId === 'number')
      countries.set(block.countryId, `Country ${block.countryId}`)
  }
  if (preferred && Number.isInteger(Number(preferred.id)) && Number(preferred.id) > 0)
    countries.set(Number(preferred.id), preferred.name)
  for (const country of cached) countries.set(country.countryId, country.countryName)
  return [...countries]
    .slice(0, 250)
    .map(([countryId, countryName]) => ({ countryId, countryName }))
    .sort((a, b) => a.countryName.localeCompare(b.countryName))
}
