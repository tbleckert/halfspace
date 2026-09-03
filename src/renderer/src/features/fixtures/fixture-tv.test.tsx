// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterAll, beforeEach, expect, it } from 'vitest'
import { clearSportmonksCache, db, writeFixtureTvRefresh } from '@/data/db'
import type { SportmonksTvListing } from '@shared/contracts'
import { FixtureTv } from './fixture-tv'

const listing: SportmonksTvListing = {
  id: 1,
  fixture_id: 10,
  tvstation_id: 1219,
  country_id: 47,
  tvstation: { id: 1219, name: 'TV4 Play', url: null, image_path: null },
  country: { id: 47, name: 'Sweden', image_path: null }
}

beforeEach(() => clearSportmonksCache())
afterAll(() => db.close())

it('filters cached broadcast listings by country while offline', async () => {
  await writeFixtureTvRefresh(10, {
    fetchedAt: Date.now(),
    listings: [
      listing,
      {
        ...listing,
        id: 2,
        tvstation_id: 1328,
        tvstation: { ...listing.tvstation!, id: 1328, name: 'tv4play' }
      },
      {
        ...listing,
        id: 3,
        tvstation_id: 99,
        country_id: 1578,
        tvstation: { ...listing.tvstation!, id: 99, name: 'VG+' },
        country: { id: 1578, name: 'Norway', image_path: null }
      }
    ]
  })
  render(<FixtureTv fixtureId={10} online={false} />)
  const region = await screen.findByRole('region', { name: 'TV listings' })
  expect(within(region).getAllByRole('listitem')).toHaveLength(3)
  fireEvent.change(screen.getByRole('combobox', { name: 'Broadcast country' }), {
    target: { value: '47' }
  })
  expect(within(region).getAllByRole('listitem')).toHaveLength(2)
  expect(within(region).getByText('TV4 Play')).toBeTruthy()
  expect(within(region).getByText('tv4play')).toBeTruthy()
  expect(within(region).queryByText('VG+')).toBeNull()
  expect(screen.getByRole('button', { name: 'Refresh TV guide' }).hasAttribute('disabled')).toBe(
    true
  )
})

it('distinguishes an empty cached guide from one not available offline', async () => {
  await writeFixtureTvRefresh(10, { listings: [], fetchedAt: Date.now() })
  const { rerender } = render(<FixtureTv key={10} fixtureId={10} online={false} />)
  expect(await screen.findByText('No broadcasts listed for this fixture.')).toBeTruthy()
  rerender(<FixtureTv key={11} fixtureId={11} online={false} />)
  expect(await screen.findByText('TV listings not available offline.')).toBeTruthy()
})
