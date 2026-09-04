// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
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

function openMatchday(): void {
  render(
    <RouterProvider
      router={createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/?date=2026-09-04'] })
      })}
    />
  )
}

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

it('switches feeds without showing previews under Reports and preserves the feed in All news', async () => {
  openMatchday()
  const rail = within(await screen.findByRole('complementary', { name: 'Matchday news' }))
  await rail.findByRole('link', { name: /Weekend preview/ })
  fireEvent.click(rail.getByRole('button', { name: 'Reports' }))
  await rail.findByText('News not available offline')
  expect(rail.queryByRole('link', { name: /Weekend preview/ })).toBeNull()
  expect(rail.getByRole('link', { name: 'All news' }).getAttribute('href')).toBe(
    '/news?feed=post-match'
  )
  fireEvent.click(rail.getByRole('button', { name: 'Previews' }))
  await rail.findByRole('link', { name: /Weekend preview/ })
})
