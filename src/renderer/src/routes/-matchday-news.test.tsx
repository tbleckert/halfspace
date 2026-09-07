// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import { clearSportmonksCache, db, writeNewsRefresh } from '@/data/db'
import { routeTree } from '@/routeTree.gen'

vi.mock('@/components/app-shell', async () => ({
  AppShell: (await import('@tanstack/react-router')).Outlet
}))
vi.mock('@/features/credentials/connection-state-provider', () => ({
  ConnectionStateProvider: ({ children }: { children: React.ReactNode }) => children
}))
vi.mock('@/lib/use-online', () => ({ useOnline: () => false }))
vi.mock('@/lib/refresh', async (original) => ({
  ...(await original<typeof import('@/lib/refresh')>()),
  useStaleRefresh: vi.fn()
}))

beforeEach(async () => {
  await clearSportmonksCache()
  await writeNewsRefresh(
    { kind: 'feed', feed: 'pre-match', page: 1 },
    {
      fetchedAt: 100,
      hasMore: true,
      articles: [
        {
          id: 1,
          fixture_id: 10,
          league_id: 8,
          type: 'prematch',
          title: 'Weekend preview',
          league: { id: 8, name: 'Premier League' },
          fixture: {
            id: 10,
            league_id: 8,
            season_id: 12,
            starting_at: '2026-09-04 18:00:00',
            state_id: 1,
            placeholder: false,
            has_odds: false,
            participants: [],
            scores: []
          },
          lines: [{ id: 1, newsitem_id: 1, type: 'home', text: 'Preview article body.' }]
        }
      ]
    }
  )
})
afterAll(() => db.close())

function openMatchday(path = '/'): void {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] })
  })

  render(<RouterProvider router={router} />)
}

it('chooses the Fixtures date from the compact calendar control', async () => {
  openMatchday('/fixtures?date=2026-09-04')

  expect(screen.queryByLabelText('Fixture date')).toBeNull()
  fireEvent.click(
    await screen.findByRole('button', {
      name: /Choose fixture date/
    })
  )
  fireEvent.click(await screen.findByRole('button', { name: /Friday, September 11/ }))

  await waitFor(() =>
    expect(
      document.querySelector('[data-slot="popover-trigger"]')?.getAttribute('aria-label')
    ).toMatch(/September 11/)
  )
  expect(screen.queryByText('Choose fixture date')).toBeNull()
})

it('opens cached news from Matchday with fixture and season context', async () => {
  openMatchday()
  const rail = within(await screen.findByRole('complementary', { name: 'Matchday news' }))
  const article = await rail.findByRole('link', { name: /Weekend preview/ })
  expect(article.getAttribute('href')).toContain('/news/1?fixture=10&competition=8&season=12')
  expect(rail.getByRole('button', { name: 'Refresh news' }).hasAttribute('disabled')).toBe(true)
  fireEvent.click(article)
  await screen.findByRole('heading', { name: 'Weekend preview', level: 1 })
  expect(screen.getByText('Preview article body.')).toBeTruthy()
})

it('combines cached previews and reports by match date in the news rail', async () => {
  await writeNewsRefresh(
    { kind: 'feed', feed: 'post-match', page: 1 },
    {
      fetchedAt: 100,
      hasMore: false,
      articles: [
        {
          id: 3,
          fixture_id: 30,
          league_id: 8,
          type: 'postmatch',
          title: 'Earlier match report',
          lines: [],
          fixture: {
            id: 30,
            league_id: 8,
            season_id: 12,
            starting_at: '2026-09-03 18:00:00',
            state_id: 5,
            placeholder: false,
            has_odds: false,
            participants: [],
            scores: []
          }
        },
        {
          id: 2,
          fixture_id: 20,
          league_id: 8,
          type: 'postmatch',
          title: 'Latest match report',
          lines: [],
          fixture: {
            id: 20,
            league_id: 8,
            season_id: 12,
            starting_at: '2026-09-04 20:00:00',
            state_id: 5,
            placeholder: false,
            has_odds: false,
            participants: [],
            scores: []
          }
        }
      ]
    }
  )
  openMatchday()
  const rail = within(await screen.findByRole('complementary', { name: 'Matchday news' }))
  await rail.findByRole('link', { name: /Weekend preview/ })
  await rail.findByRole('link', { name: /Latest match report/ })

  expect(rail.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
    'Latest match report',
    'Weekend preview',
    'Earlier match report'
  ])
  expect(rail.getAllByText('AI-written report')).toHaveLength(2)
  expect(rail.getAllByText('Match date · 2026-09-04')).toHaveLength(2)
  expect(rail.queryByRole('heading', { name: 'News' })).toBeNull()
  expect(rail.queryByRole('group', { name: 'News type' })).toBeNull()
  expect(rail.getByRole('link', { name: 'All news' }).getAttribute('href')).toBe('/news')
})
