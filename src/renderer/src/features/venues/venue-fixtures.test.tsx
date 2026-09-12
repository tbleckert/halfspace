// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider
} from '@tanstack/react-router'
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { SportmonksFixture } from '@shared/contracts'
import { clearSportmonksCache, db } from '@/data/db'
import { writeVenueFixturesRefresh } from '@/data/venue-fixtures-cache'
import { VenueFixtures } from './venue-fixtures'

const input = { venueId: 206, startDate: '2026-08-13', endDate: '2026-10-12', timeZone: 'UTC' }
function fixture(
  id: number,
  state: number,
  date: string,
  overrides: Partial<SportmonksFixture> = {}
): SportmonksFixture {
  return {
    id,
    venue_id: 206,
    league_id: 8,
    season_id: 42,
    state_id: state,
    starting_at_timestamp: Date.parse(date) / 1000,
    placeholder: false,
    has_odds: false,
    scores: [],
    participants: [
      { id: 1, name: `Home ${id}`, meta: { location: 'home' } },
      { id: 2, name: `Away ${id}`, meta: { location: 'away' } }
    ],
    ...overrides
  }
}
beforeEach(async () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-12T12:00:00Z'))
  await clearSportmonksCache()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
afterAll(() => db.close())
function showVenue(): void {
  vi.stubGlobal('halfspace', { sportmonks: { refreshFixtureWindow: vi.fn() } })
  const root = createRootRoute({
    component: () => <VenueFixtures input={input} date="2026-09-12" online={false} />
  })
  render(
    <RouterProvider router={createRouter({ routeTree: root, history: createMemoryHistory() })} />
  )
}
it('shows confirmed results, future scheduled fixtures and ongoing matches with their own context', async () => {
  await writeVenueFixturesRefresh(input, {
    fetchedAt: 100,
    timeZone: 'UTC',
    pageCount: 1,
    fixtures: [
      fixture(1, 5, '2026-09-10T19:00:00Z', {
        scores: [
          {
            id: 1,
            participant_id: 1,
            description: 'CURRENT',
            score: { goals: 0, participant: 'home' }
          },
          {
            id: 2,
            participant_id: 2,
            description: 'CURRENT',
            score: { goals: 2, participant: 'away' }
          }
        ]
      }),
      fixture(2, 1, '2026-09-20T19:00:00Z'),
      fixture(3, 3, '2026-09-11T22:00:00Z'),
      fixture(4, 10, '2026-09-15T19:00:00Z'),
      fixture(5, 1, '2026-09-10T19:00:00Z'),
      fixture(6, 1, '2026-09-20T19:00:00Z', { placeholder: true })
    ]
  })
  showVenue()
  const result = await screen.findByRole('link', { name: /Home 1.*Away 1/ })
  expect(result.getAttribute('href')).toContain('competition=8')
  expect(result.getAttribute('href')).toContain('season=42')
  expect(within(result).getByText('0')).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'In progress' })).toBeTruthy()
  expect(screen.getByRole('link', { name: /Home 2.*Away 2/ })).toBeTruthy()
  expect(screen.getByRole('link', { name: /Home 3.*Away 3/ })).toBeTruthy()
  expect(screen.queryByText('Home 4')).toBeNull()
  expect(screen.queryByText('Home 5')).toBeNull()
  expect(screen.queryByText('Home 6')).toBeNull()
})
it.each([true, false])(
  'distinguishes an empty cached window from unavailable offline data (%s)',
  async (cached) => {
    if (cached)
      await writeVenueFixturesRefresh(input, {
        fixtures: [],
        fetchedAt: 100,
        timeZone: 'UTC',
        pageCount: 1
      })
    showVenue()
    if (cached) await screen.findByText('No recent results in this window')
    else await screen.findByText('Matches not available offline')
  }
)
