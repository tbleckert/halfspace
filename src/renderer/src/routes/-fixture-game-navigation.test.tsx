// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
  type Router
} from '@tanstack/react-router'
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  writeFixtureDetailRefresh,
  writeFixturePressureRefresh,
  writeSubscriptionRefresh
} from '@/data/db'
import type { SportmonksFixture, SportmonksFixtureStatistic } from '@shared/contracts'
import { routeTree } from '@/routeTree.gen'

const connection = vi.hoisted(() => ({ online: false }))

vi.mock('@/components/app-shell', async () => ({
  AppShell: (await import('@tanstack/react-router')).Outlet
}))
vi.mock('@/features/credentials/connection-state-provider', () => ({
  ConnectionStateProvider: ({ children }: { children: React.ReactNode }) => children
}))
vi.mock('@/lib/use-online', () => ({ useOnline: () => connection.online }))
beforeEach(() => {
  connection.online = false
  return clearSportmonksCache()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.close())

function fixture(stateId: number, id = 50): SportmonksFixture {
  return {
    id,
    league_id: 8,
    season_id: 12,
    state_id: stateId,
    placeholder: false,
    has_odds: false,
    participants: [
      { id: 1, name: 'Home team', meta: { location: 'home' } },
      { id: 2, name: 'Away team', meta: { location: 'away' } }
    ],
    scores: [],
    statistics: [
      { type_id: 45, location: 'home', data: { value: 60 } },
      { type_id: 45, location: 'away', data: { value: 40 } }
    ] as SportmonksFixtureStatistic[]
  }
}

function openFixture(path = '/fixtures/50'): Router<typeof routeTree> {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [`${path}?competition=8&season=12&team=1&date=2026-09-03`]
    })
  })
  render(<RouterProvider router={router} />)
  return router
}

it.each([
  [1, 'Preview'],
  [2, 'Game'],
  [3, 'Game'],
  [5, 'Game'],
  [10, 'Preview'],
  [12, 'Preview']
] as const)(
  'opens the appropriate default for state %s and preserves context',
  async (stateId, tab) => {
    await writeFixtureDetailRefresh({ fetchedAt: Date.now(), fixture: fixture(stateId) })
    const router = openFixture()
    const navigation = await screen.findByRole('navigation', { name: 'Fixture' })
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/fixtures/50/${tab.toLowerCase()}`)
    )
    expect(within(navigation).getByRole('link', { name: tab }).getAttribute('aria-current')).toBe(
      'page'
    )
    expect(router.state.location.search).toMatchObject({
      competition: 8,
      season: 12,
      team: 1,
      date: '2026-09-03'
    })
  }
)

it('waits for fixture data before choosing a default', async () => {
  const router = openFixture()
  await screen.findByText('Fixture not available offline.')
  expect(router.state.location.pathname).toBe('/fixtures/50')
  await act(() => writeFixtureDetailRefresh({ fetchedAt: Date.now(), fixture: fixture(5) }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/fixtures/50/game'))
})

it('keeps the chosen Preview open through kickoff, halftime, and full time', async () => {
  const fetchedAt = Date.now()
  await writeFixtureDetailRefresh({ fetchedAt, fixture: fixture(1) })
  const router = openFixture()
  await waitFor(() => expect(router.state.location.pathname).toBe('/fixtures/50/preview'))
  for (const stateId of [2, 3, 5]) {
    await act(() =>
      writeFixtureDetailRefresh({ fetchedAt: fetchedAt + stateId, fixture: fixture(stateId) })
    )
    expect(router.state.location.pathname).toBe('/fixtures/50/preview')
    expect(screen.getByRole('link', { name: 'Preview' }).getAttribute('aria-current')).toBe('page')
  }
  await act(() => router.navigate({ to: '/fixtures/$fixtureId', params: { fixtureId: '50' } }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/fixtures/50/game'))
  fireEvent.click(screen.getByRole('link', { name: 'Preview' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/fixtures/50/preview'))
})

it.each([
  ['preview', 5],
  ['game', 1],
  ['stats', 5]
] as const)('respects an explicit %s link regardless of match state', async (tab, stateId) => {
  await writeFixtureDetailRefresh({ fetchedAt: Date.now(), fixture: fixture(stateId) })
  const router = openFixture(`/fixtures/50/${tab}`)
  await screen.findByRole('navigation', { name: 'Fixture' })
  expect(router.state.location.pathname).toBe(`/fixtures/50/${tab}`)
  const label = tab.charAt(0).toUpperCase() + tab.slice(1)
  expect(screen.getByRole('link', { name: label }).getAttribute('aria-current')).toBe('page')
})

it('shows cached pressure and key stats in Game, links to full stats, and keeps Preview reachable', async () => {
  const fetchedAt = Date.now()
  await writeFixtureDetailRefresh({ fetchedAt, fixture: fixture(5) })
  await writeFixturePressureRefresh(50, {
    fetchedAt,
    points: [{ id: 1, fixture_id: 50, participant_id: 1, minute: 1, pressure: 12.5 }]
  })
  const router = openFixture()
  expect(await screen.findByRole('slider', { name: 'Pressure by minute' })).toBeTruthy()
  expect(screen.getByText('60%')).toBeTruthy()
  expect(screen.getByText('40%')).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Timeline' })).toBeTruthy()
  fireEvent.click(screen.getByRole('link', { name: 'Full stats' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/fixtures/50/stats'))
  expect(screen.queryByRole('slider', { name: 'Pressure by minute' })).toBeNull()
  expect(router.state.location.search).toMatchObject({
    competition: 8,
    season: 12,
    team: 1,
    date: '2026-09-03'
  })
  fireEvent.click(screen.getByRole('link', { name: 'Preview' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/fixtures/50/preview'))
})

it('keeps key stats and the timeline available without pressure', async () => {
  await writeFixtureDetailRefresh({ fetchedAt: Date.now(), fixture: fixture(5) })
  await writeFixturePressureRefresh(50, { fetchedAt: Date.now(), points: [] })
  openFixture('/fixtures/50/game')
  expect(await screen.findByText('60%')).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Timeline' })).toBeTruthy()
  expect(screen.queryByText('Pressure')).toBeNull()
})

it('loads pressure only in Game and retains cached readings if its refresh fails', async () => {
  const fetchedAt = Date.now()
  const match = fixture(5)
  await writeFixtureDetailRefresh({ fetchedAt, fixture: match })
  await writeSubscriptionRefresh({
    fetchedAt,
    plans: [],
    addOns: [],
    resources: [{ id: 142, description: 'Fixtures' }],
    enrichments: [{ id: 138, name: 'Pressure Index' }]
  })
  const refreshFixturePressure = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      data: {
        fetchedAt,
        points: [{ id: 1, fixture_id: 50, participant_id: 1, minute: 1, pressure: 12.5 }]
      }
    })
    .mockResolvedValue({ ok: false, error: { message: 'Rate limit reached.' } })
  vi.stubGlobal('halfspace', {
    sportmonks: {
      refreshFixturePressure,
      refreshFixture: vi.fn().mockResolvedValue({ ok: true, data: { fetchedAt, fixture: match } })
    }
  })
  connection.online = true
  const router = openFixture('/fixtures/50/stats')
  await screen.findByRole('navigation', { name: 'Fixture' })
  expect(refreshFixturePressure).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('link', { name: 'Game' }))
  await screen.findByRole('slider', { name: 'Pressure by minute' })
  expect(refreshFixturePressure).toHaveBeenCalledExactlyOnceWith({ fixtureId: 50 })
  fireEvent.click(screen.getByRole('button', { name: 'Refresh Home team vs Away team' }))
  await screen.findByText('Rate limit reached.')
  expect(screen.getByRole('slider', { name: 'Pressure by minute' })).toBeTruthy()
  fireEvent.click(screen.getByRole('link', { name: 'Full stats' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/fixtures/50/stats'))
  fireEvent.click(screen.getByRole('button', { name: 'Refresh Home team vs Away team' }))
  expect(refreshFixturePressure).toHaveBeenCalledTimes(2)
})
