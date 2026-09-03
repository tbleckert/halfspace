// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import type { SportmonksTransfer } from '@shared/contracts'
import { clearSportmonksCache, db, writeTransferFeedRefresh } from '@/data/db'
import { routeTree } from '@/routeTree.gen'
import { makeTopscorer } from '../../../test/topscorer-fixtures'

vi.mock('@/components/app-shell', async () => ({
  AppShell: (await import('@tanstack/react-router')).Outlet
}))
vi.mock('@/features/credentials/connection-state-provider', () => ({
  ConnectionStateProvider: ({ children }: { children: React.ReactNode }) => children
}))
vi.mock('@/lib/use-online', () => ({ useOnline: () => false }))
beforeEach(() => clearSportmonksCache())
afterAll(() => db.close())

it('browses cached pages, filters the displayed page and preserves club links when includes are absent', async () => {
  const transfer: SportmonksTransfer = {
    id: 1,
    sport_id: 1,
    player_id: 100,
    type_id: 219,
    from_team_id: 19,
    to_team_id: null,
    position_id: null,
    detailed_position_id: null,
    date: '2026-09-01',
    career_ended: false,
    completed: false,
    amount: 5000000,
    player: makeTopscorer().player
  }
  await writeTransferFeedRefresh(
    { feed: 'latest', page: 1 },
    { transfers: [transfer], page: 1, hasMore: true, fetchedAt: Date.now() }
  )
  await writeTransferFeedRefresh(
    { feed: 'latest', page: 2 },
    {
      transfers: [
        {
          ...transfer,
          id: 2,
          player_id: 101,
          completed: true,
          player: { ...makeTopscorer().player!, id: 101, display_name: 'Jamie Midfielder' }
        }
      ],
      page: 2,
      hasMore: false,
      fetchedAt: Date.now()
    }
  )
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/transfers'] })
  })
  render(<RouterProvider router={router} />)
  const player = await screen.findByRole('link', { name: 'Alex Forward' })
  expect(player.getAttribute('href')).toContain('/players/100')
  expect(screen.getByRole('link', { name: 'Team 19' }).getAttribute('href')).toContain('/teams/19')
  expect(screen.getByText('Not reported')).toBeTruthy()
  expect(screen.queryByText(/5.000.000|Free agent/)).toBeNull()
  fireEvent.change(screen.getByRole('textbox', { name: 'Filter this page by player or club' }), {
    target: { value: 'no match' }
  })
  await screen.findByText('No matching transfers on this page')
  fireEvent.change(screen.getByRole('textbox', { name: 'Filter this page by player or club' }), {
    target: { value: '' }
  })
  await screen.findByRole('link', { name: 'Alex Forward' })
  fireEvent.click(screen.getByRole('button', { name: 'Next transfer page' }))
  await screen.findByRole('link', { name: 'Jamie Midfielder' })
  expect(router.state.location.search.page).toBe(2)
  expect(screen.queryByRole('link', { name: 'Alex Forward' })).toBeNull()
  expect(
    (screen.getByRole('button', { name: 'Next transfer page' }) as HTMLButtonElement).disabled
  ).toBe(true)
  fireEvent.click(screen.getByRole('link', { name: 'By date' }))
  await waitFor(() => expect(router.state.location.search.page).toBeUndefined())
  expect(
    within(screen.getByRole('table', { name: 'Transfers' })).queryByText('Jamie Midfielder')
  ).toBeNull()
})
