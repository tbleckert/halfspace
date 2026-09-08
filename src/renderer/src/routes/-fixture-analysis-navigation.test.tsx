// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import type { SportmonksFixture, SportmonksLineup } from '@shared/contracts'
import {
  clearSportmonksCache,
  db,
  writeFixtureDetailRefresh,
  writeExpectedLineupsRefresh,
  writePredictedLineupsRefresh,
  writeFixturePeriodStatisticsRefresh
} from '@/data/db'
import { routeTree } from '@/routeTree.gen'

vi.mock('@/components/app-shell', async () => ({
  AppShell: (await import('@tanstack/react-router')).Outlet
}))
vi.mock('@/features/credentials/connection-state-provider', () => ({
  ConnectionStateProvider: ({ children }: { children: React.ReactNode }) => children
}))
vi.mock('@/lib/use-online', () => ({ useOnline: () => false }))
beforeEach(clearSportmonksCache)
afterAll(() => db.close())

it('restores forecast and period choices from the URL inside the persistent fixture shell', async () => {
  const fixture: SportmonksFixture = {
    id: 10,
    league_id: 8,
    season_id: 12,
    state_id: 1,
    placeholder: false,
    has_odds: false,
    participants: [
      { id: 19, name: 'Home', meta: { location: 'home' } },
      { id: 9, name: 'Away', meta: { location: 'away' } }
    ],
    scores: [],
    lineups: [],
    statistics: [
      {
        id: 1,
        fixture_id: 10,
        participant_id: 19,
        type_id: 45,
        location: 'home',
        data: { value: 60 }
      }
    ]
  }
  const lineup: SportmonksLineup = {
    id: 1,
    fixture_id: 10,
    player_id: 100,
    team_id: 19,
    type_id: 77614,
    position_id: 27,
    jersey_number: 9,
    player_name: 'Expected starter'
  }
  const fetchedAt = Date.now()
  await writeFixtureDetailRefresh({ fixture, fetchedAt })
  await writeExpectedLineupsRefresh(10, { fixtureId: 10, lineups: [lineup], fetchedAt })
  await writePredictedLineupsRefresh(10, {
    fixtureId: 10,
    lineups: [{ ...lineup, type_id: 111384, player_name: 'Predicted starter' }],
    fetchedAt
  })
  await writeFixturePeriodStatisticsRefresh(10, {
    fixtureId: 10,
    fetchedAt,
    periods: [
      {
        id: 20,
        fixture_id: 10,
        type_id: 1,
        description: 'First half',
        sort_order: 1,
        statistics: [{ ...fixture.statistics![0], period_id: 20, data: { value: 40 } }]
      }
    ]
  })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: ['/fixtures/10/lineups?competition=8&season=12&lineupSource=expected']
    })
  })
  render(<RouterProvider router={router} />)
  await screen.findByText('Expected starter')
  const header = screen.getByRole('heading', { name: 'Home vs Away' })
  fireEvent.change(screen.getByRole('combobox', { name: 'Lineup forecast' }), {
    target: { value: 'predicted' }
  })
  await screen.findByText('Predicted starter')
  expect(router.state.location.search.lineupSource).toBe('predicted')
  await act(() => router.history.back())
  await screen.findByText('Expected starter')
  fireEvent.click(screen.getByRole('link', { name: 'Stats' }))
  await screen.findByRole('option', { name: 'First half' })
  fireEvent.change(screen.getByRole('combobox', { name: 'Statistics period' }), {
    target: { value: '20' }
  })
  await screen.findByText('40')
  expect(router.state.location.search).toMatchObject({ competition: 8, season: 12, period: 20 })
  expect(screen.queryByText('60')).toBeNull()
  expect(screen.getByRole('heading', { name: 'Home vs Away' })).toBe(header)
  await act(() => router.history.back())
  await screen.findByText('60')
  expect(router.state.location.search.period).toBeUndefined()
})
