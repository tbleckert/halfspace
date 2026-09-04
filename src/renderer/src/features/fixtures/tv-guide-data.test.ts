import { describe, expect, it } from 'vitest'
import type { SportmonksTvListing } from '@shared/contracts'
import { tvGuideStations } from './tv-guide-data'

const listing: SportmonksTvListing = {
  id: 1,
  fixture_id: 10,
  tvstation_id: 41,
  country_id: 251,
  tvstation: { id: 41, name: 'DAZN', url: 'https://www.dazn.com', image_path: null },
  country: { id: 251, name: 'Italy', image_path: null }
}

describe('TV guide presentation', () => {
  it('deduplicates a station while preserving its fixture-specific countries', () => {
    const listings = [
      listing,
      listing,
      { ...listing, id: 2, country_id: 11, country: { id: 11, name: 'Germany', image_path: null } }
    ]
    expect(tvGuideStations(listings, 'all')).toMatchObject([
      { name: 'DAZN', countries: ['Germany', 'Italy'] }
    ])
    expect(tvGuideStations(listings, '251')).toMatchObject([{ name: 'DAZN', countries: ['Italy'] }])
    expect(tvGuideStations(listings, '999')).toEqual([])
  })
  it('does not invent a broadcast region', () => {
    const stations = tvGuideStations(
      [
        {
          ...listing,
          country: null
        }
      ],
      'all'
    )
    expect(stations[0]).toMatchObject({ countries: ['Region not specified'] })
  })
})
