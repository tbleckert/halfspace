// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import { clearSportmonksCache, db, writeCompetitionRefresh, writeNewsRefresh } from '@/data/db'
import { routeTree } from '@/routeTree.gen'
vi.mock('@/components/app-shell', async () => ({
  AppShell: (await import('@tanstack/react-router')).Outlet
}))
vi.mock('@/features/credentials/connection-state-provider', () => ({
  ConnectionStateProvider: ({ children }: { children: React.ReactNode }) => children
}))
vi.mock('@/lib/use-online', () => ({ useOnline: () => false }))
beforeEach(async () => {
  await clearSportmonksCache()
  await writeCompetitionRefresh({
    competitions: [
      {
        id: 8,
        country_id: 1,
        name: 'League',
        active: true,
        currentseason: {
          id: 12,
          league_id: 8,
          name: '2026',
          is_current: true,
          starting_at: '2026-01-01',
          ending_at: '2026-12-31'
        }
      }
    ],
    fetchedAt: 200,
    pageCount: 1
  })
  await writeNewsRefresh(
    { kind: 'feed', feed: 'pre-match', page: 1, seasonId: 12 },
    {
      fetchedAt: 200,
      hasMore: true,
      articles: [
        {
          id: 1,
          fixture_id: 10,
          league_id: 8,
          title: 'Opening match',
          type: 'prematch',
          fixture: {
            id: 10,
            league_id: 8,
            season_id: 12,
            state_id: 1,
            placeholder: false,
            has_odds: false,
            participants: [],
            scores: []
          },
          lines: [
            { id: 1, newsitem_id: 1, type: 'home', text: 'Home paragraph' },
            { id: 2, newsitem_id: 1, type: 'away', text: 'Away <strong>literal</strong> paragraph' }
          ]
        }
      ]
    }
  )
})
afterAll(() => db.close())
it('opens cached articles and retains fixture and season context offline', async () => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/news?competition=8&season=12'] })
  })
  render(<RouterProvider router={router} />)
  fireEvent.click(await screen.findByRole('link', { name: /Opening match/ }))
  await screen.findByRole('heading', { name: 'Opening match', level: 1 })
  expect(screen.getByText('Away <strong>literal</strong> paragraph')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'View match' }).getAttribute('href')).toContain(
    '/fixtures/10?competition=8&season=12'
  )
  expect(router.state.location.search.fixture).toBe(10)
})
it('does not show the previous feed page while an uncached page is selected', async () => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/news?competition=8&season=12'] })
  })
  render(<RouterProvider router={router} />)
  await screen.findByRole('link', { name: /Opening match/ })
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  await waitFor(() => expect(router.state.location.search.page).toBe(2))
  await screen.findByText('News not available offline')
  expect(screen.queryByRole('link', { name: /Opening match/ })).toBeNull()
})
