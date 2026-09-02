// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  writeFixtureCommentaryRefresh,
  writeFixtureDetailRefresh
} from '@/data/db'
import { routeTree } from '@/routeTree.gen'

vi.mock('@/components/app-shell', async () => ({
  AppShell: (await import('@tanstack/react-router')).Outlet
}))
vi.mock('@/features/credentials/connection-state-provider', () => ({
  ConnectionStateProvider: ({ children }: { children: React.ReactNode }) => children
}))
vi.mock('@/lib/use-online', () => ({ useOnline: () => false }))
beforeEach(() => clearSportmonksCache())
afterAll(() => db.close())

it('opens and filters cached commentary offline without losing fixture context', async () => {
  const fetchedAt = Date.now()
  await writeFixtureDetailRefresh({
    fetchedAt,
    fixture: {
      id: 50,
      league_id: 8,
      season_id: 12,
      state_id: 5,
      placeholder: false,
      has_odds: false,
      participants: [],
      scores: []
    }
  })
  const comment = {
    fixture_id: 50,
    minute: 90,
    extra_minute: 3,
    is_goal: false,
    is_important: false
  }
  await writeFixtureCommentaryRefresh(50, {
    fetchedAt,
    commentaries: [
      { ...comment, id: 1, comment: 'A late chance.', order: 1 },
      { ...comment, id: 2, comment: 'Goal!', is_goal: true, order: 2 },
      { ...comment, id: 3, comment: 'Full time.', minute: null, order: 3 }
    ]
  })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/fixtures/50?competition=8&season=12'] })
  })
  render(<RouterProvider router={router} />)
  fireEvent.click(await screen.findByRole('link', { name: 'Commentary' }))
  const list = await screen.findByRole('list', { name: 'Commentary, newest first' })
  expect(within(list).getAllByRole('listitem')[0].textContent).toContain('Full time.')
  fireEvent.change(screen.getByRole('combobox', { name: 'Commentary filter' }), {
    target: { value: 'key' }
  })
  expect(within(list).getAllByRole('listitem')).toHaveLength(1)
  expect(within(list).getByText('90+3′')).toBeTruthy()
  expect(router.state.location.search).toMatchObject({ competition: 8, season: 12 })
})
