// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  writeCompetitionSeasonsRefresh,
  writeSeasonBracketRefresh,
  writeSeasonScheduleRefresh
} from '@/data/db'
import { routeTree } from '@/routeTree.gen'

vi.mock('@/components/app-shell', async () => ({
  AppShell: (await import('@tanstack/react-router')).Outlet
}))
vi.mock('@/features/credentials/connection-state-provider', () => ({
  ConnectionStateProvider: ({ children }: { children: React.ReactNode }) => children
}))
vi.mock('@/lib/use-online', () => ({ useOnline: () => false }))
beforeEach(async () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      disconnect = vi.fn()
    }
  )
  await clearSportmonksCache()
  await db.competitions.put({
    id: 27,
    countryId: 1,
    name: 'Cup',
    active: true,
    imagePath: null,
    currentSeasonId: 12,
    currentSeasonName: '2026',
    raw: { id: 27, country_id: 1, name: 'Cup', active: true },
    fetchedAt: Date.now()
  })
  await writeCompetitionSeasonsRefresh(27, {
    seasons: [12, 11].map((id) => ({
      id,
      league_id: 27,
      name: id === 12 ? '2026' : '2025',
      is_current: id === 12,
      starting_at: `${id === 12 ? 2026 : 2025}-01-01`,
      ending_at: `${id === 12 ? 2026 : 2025}-12-31`
    })),
    fetchedAt: Date.now(),
    pageCount: 1
  })
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.close())

it('browses a cached domestic cup offline and retains the subpage without showing another season', async () => {
  const fixture = {
    id: 101,
    league_id: 27,
    season_id: 12,
    stage_id: 5,
    state_id: 5,
    placeholder: false,
    has_odds: false,
    name: 'Arsenal vs Chelsea',
    participants: [
      { id: 19, name: 'Arsenal', meta: { location: 'home' as const, winner: true } },
      { id: 18, name: 'Chelsea', meta: { location: 'away' as const, winner: false } }
    ],
    scores: []
  }
  await writeSeasonScheduleRefresh(12, {
    fetchedAt: Date.now(),
    stages: [
      {
        id: 5,
        season_id: 12,
        name: 'Final',
        sort_order: 1,
        is_current: false,
        finished: true,
        fixtures: [fixture],
        rounds: []
      }
    ]
  })
  await writeSeasonBracketRefresh(12, {
    fetchedAt: Date.now(),
    stages: [],
    edges: [],
    catalog: [{ id: 5, season_id: 12, type_id: 224, name: 'Final', sort_order: 1, aggregates: [] }]
  })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/competitions/27/knockout?season=12'] })
  })
  render(<RouterProvider router={router} />)
  await screen.findByText('Winner: Arsenal')
  expect(screen.getByRole('link', { name: /Arsenal.*Chelsea/ }).getAttribute('href')).toContain(
    '/fixtures/101?competition=27&season=12'
  )
  fireEvent.change(screen.getByRole('combobox', { name: 'Season' }), { target: { value: '11' } })
  await waitFor(() => expect(router.state.location.search.season).toBe(11))
  expect(router.state.location.pathname).toBe('/competitions/27/knockout')
  await screen.findByText('Knockout rounds are not available offline')
  expect(screen.queryByText('Winner: Arsenal')).toBeNull()
})
