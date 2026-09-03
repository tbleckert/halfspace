// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SportmonksFixture } from '@shared/contracts'
import { clearSportmonksCache, db, writeFixtureDetailRefresh, writeRefereeRefresh } from '@/data/db'
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

describe('referee navigation', () => {
  it('opens a cached referee from a fixture and preserves the return context offline', async () => {
    const referee = {
      id: 7,
      name: 'Alex Official',
      display_name: 'A. Official',
      country_id: 462,
      country: { id: 462, name: 'England' }
    }
    const assignment = {
      id: 1,
      referee_id: 7,
      fixture_id: 50,
      type_id: 6,
      type: { id: 6, name: 'Referee' }
    }
    const fixture: SportmonksFixture = {
      id: 50,
      name: 'Home vs Away',
      league_id: 8,
      season_id: 10,
      state_id: 5,
      placeholder: false,
      has_odds: false,
      starting_at_timestamp: 1788300000,
      league: { id: 8, name: 'Premier League' },
      participants: [
        { id: 9, name: 'Home', meta: { location: 'home' } },
        { id: 10, name: 'Away', meta: { location: 'away' } }
      ],
      scores: [],
      referees: [{ ...assignment, referee }]
    }
    await writeFixtureDetailRefresh({ fixture, fetchedAt: Date.now() })
    await writeRefereeRefresh({
      referee: {
        ...referee,
        latest: [{ ...assignment, fixture }],
        statistics: [
          {
            id: 1,
            referee_id: 7,
            season_id: 10,
            details: [{ type_id: 188, value: { count: 4 } }],
            season: {
              id: 10,
              league_id: 8,
              name: '2025/2026',
              starting_at: '2025-08-01',
              league: { id: 8, name: 'Premier League' }
            }
          },
          {
            id: 2,
            referee_id: 7,
            season_id: 11,
            details: [{ type_id: 188, value: { count: 9 } }],
            season: {
              id: 11,
              league_id: 8,
              name: '2026/2027',
              starting_at: '2026-08-01',
              league: { id: 8, name: 'Premier League' }
            }
          }
        ]
      },
      fetchedAt: Date.now()
    })
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({
        initialEntries: ['/fixtures/50/preview?competition=8&season=10']
      })
    })
    render(<RouterProvider router={router} />)
    fireEvent.click(await screen.findByRole('link', { name: /A. Official/ }))
    expect(await screen.findByRole('heading', { name: 'Alex Official' })).toBeTruthy()
    expect(screen.getByText('Last six months')).toBeTruthy()
    expect(screen.getByText('4')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Referee statistics season'), {
      target: { value: '11' }
    })
    expect(await screen.findByText('9')).toBeTruthy()
    expect(screen.queryByText('4')).toBeNull()
    expect(router.state.location.search).toMatchObject({ season: 10, statsSeason: 11, fixture: 50 })
    const back = screen.getByRole('link', { name: 'Match' })
    expect(back.getAttribute('href')).toContain('competition=8')
    expect(back.getAttribute('href')).toContain('season=10')
    fireEvent.click(back)
    expect(await screen.findByRole('link', { name: /A. Official/ })).toBeTruthy()
  })
})
