// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import { clearSportmonksCache, db, writeTeamRivalsRefresh } from '@/data/db'
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

it('opens a rival team offline without carrying over the previous competition season', async () => {
  const team = {
    id: 1,
    sport_id: 1,
    country_id: 1,
    name: 'Home Club',
    venue_id: null,
    gender: 'male',
    founded: null,
    placeholder: false
  }
  await writeTeamRivalsRefresh(1, {
    fetchedAt: Date.now(),
    rivals: [{ team_id: 1, rival_id: 2, team, rival: { ...team, id: 2, name: 'Rival Club' } }]
  })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: ['/teams/1?competition=8&season=12&date=2026-09-02']
    })
  })
  render(<RouterProvider router={router} />)
  fireEvent.click(await screen.findByRole('link', { name: 'Rival Club' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/teams/2'))
  expect(await screen.findByRole('heading', { name: 'Rival Club' })).toBeTruthy()
  expect(router.state.location.search).toMatchObject({ date: '2026-09-02' })
  expect(router.state.location.search.competition).toBeUndefined()
  expect(router.state.location.search.season).toBeUndefined()
})
