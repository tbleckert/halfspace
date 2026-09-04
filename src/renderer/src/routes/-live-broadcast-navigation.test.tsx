// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  writeCompetitionSeasonsRefresh,
  writeStandingsRefresh,
  writeLiveStandingsRefresh,
  writeBroadcasterRefresh,
  writeBroadcastScheduleRefresh,
  writeFixtureDetailRefresh,
  writeFixtureTvRefresh
} from '@/data/db'
import type { SportmonksFixture, SportmonksStanding } from '@shared/contracts'
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

function open(path: string): ReturnType<typeof createRouter<typeof routeTree>> {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] })
  })
  render(<RouterProvider router={router} />)
  return router
}

it('switches live and current tables, then clears live selection when changing season', async () => {
  const fetchedAt = Date.now()
  await db.competitions.put({
    id: 8,
    countryId: 1,
    name: 'Premier League',
    active: true,
    imagePath: null,
    currentSeasonId: 12,
    currentSeasonName: '2026',
    raw: { id: 8, country_id: 1, name: 'Premier League', active: true },
    fetchedAt
  })
  await writeCompetitionSeasonsRefresh(8, {
    seasons: [12, 11].map((id) => ({
      id,
      league_id: 8,
      name: id === 12 ? '2026' : '2025',
      is_current: id === 12,
      starting_at: `${id === 12 ? 2026 : 2025}-01-01`,
      ending_at: `${id === 12 ? 2026 : 2025}-12-31`
    })),
    fetchedAt,
    pageCount: 1
  })
  const standing: SportmonksStanding = {
    id: 1,
    participant_id: 19,
    league_id: 8,
    season_id: 12,
    stage_id: 1,
    group_id: null,
    round_id: 4,
    standing_rule_id: null,
    position: 1,
    result: 'up',
    points: 3,
    participant: { id: 19, name: 'Arsenal' }
  }
  await writeStandingsRefresh(12, { standings: [{ ...standing, points: 0 }], fetchedAt })
  await writeLiveStandingsRefresh(
    { competitionId: 8, seasonId: 12 },
    { standings: [standing], fetchedAt }
  )
  const router = open('/competitions/8/table?season=12&table=live')
  const liveTable = await screen.findByRole('table', { name: 'Live table' })
  expect(within(liveTable).getByRole('cell', { name: '3' })).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox', { name: 'Table round' }), {
    target: { value: 'current' }
  })
  await waitFor(() => expect(router.state.location.search.table).toBeUndefined())
  expect(
    within(await screen.findByRole('table', { name: 'Current table' })).getByRole('cell', {
      name: '0'
    })
  ).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox', { name: 'Table round' }), {
    target: { value: 'live' }
  })
  await screen.findByRole('table', { name: 'Live table' })
  fireEvent.change(screen.getByRole('combobox', { name: 'Season' }), { target: { value: '11' } })
  await waitFor(() => expect(router.state.location.search.season).toBe(11))
  expect(router.state.location.pathname).toBe('/competitions/8/table')
  expect(router.state.location.search.table).toBeUndefined()
  expect(screen.queryByRole('table', { name: 'Live table' })).toBeNull()
  expect(screen.queryByRole('option', { name: 'Live table' })).toBeNull()
  expect(screen.queryByText('Arsenal')).toBeNull()
})

const fixture: SportmonksFixture = {
  id: 10,
  league_id: 8,
  season_id: 12,
  state_id: 1,
  placeholder: false,
  has_odds: false,
  participants: [
    { id: 19, name: 'Arsenal', meta: { location: 'home' } },
    { id: 8, name: 'Liverpool', meta: { location: 'away' } }
  ],
  scores: []
}

it('opens broadcaster schedules from fixture TV, pages offline, and returns with season context', async () => {
  const fetchedAt = Date.now()
  const station = { id: 34, name: 'Viaplay', image_path: null, url: 'javascript:alert(1)' }
  const listing = {
    id: 1,
    fixture_id: 10,
    tvstation_id: 34,
    country_id: 47,
    tvstation: station,
    country: { id: 47, name: 'Sweden', image_path: null }
  }
  await writeFixtureDetailRefresh({ fixture, fetchedAt })
  await writeFixtureTvRefresh(10, { fetchedAt, listings: [listing] })
  await writeBroadcasterRefresh(34, { station, fetchedAt })
  await writeBroadcastScheduleRefresh(
    { stationId: 34, feed: 'upcoming', page: 1 },
    {
      stationId: 34,
      feed: 'upcoming',
      page: 1,
      fixtures: [fixture],
      listings: [listing],
      hasMore: true,
      fetchedAt
    }
  )
  await writeBroadcastScheduleRefresh(
    { stationId: 34, feed: 'upcoming', page: 2 },
    {
      stationId: 34,
      feed: 'upcoming',
      page: 2,
      fixtures: [],
      listings: [],
      hasMore: false,
      fetchedAt
    }
  )
  const router = open('/fixtures/10/preview?competition=8&season=12')
  fireEvent.click(await screen.findByRole('link', { name: /Viaplay/ }))
  await screen.findByRole('heading', { name: 'Viaplay' })
  expect(router.state.location.search).toMatchObject({ fixture: 10, competition: 8, season: 12 })
  expect(await screen.findByText('Sweden', { exact: false })).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Website' })).toBeNull()
  expect(screen.getByRole('link', { name: /Arsenal.*Liverpool/ }).getAttribute('href')).toContain(
    '/fixtures/10?competition=8&season=12'
  )
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  await screen.findByText('No broadcasts on this page')
  expect(router.state.location.search.page).toBe(2)
  expect(screen.queryByText('Arsenal')).toBeNull()
  fireEvent.click(screen.getByRole('link', { name: 'Past' }))
  await screen.findByText('Broadcast schedule not available offline')
  expect(router.state.location.search.page).toBeUndefined()
  fireEvent.click(screen.getByRole('link', { name: 'Back to match' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/fixtures/10/preview'))
  expect(router.state.location.search).toMatchObject({ competition: 8, season: 12 })
  await act(() =>
    router.navigate({ to: '/broadcasters/$stationId', params: { stationId: '99' }, search: {} })
  )
  await screen.findByRole('heading', { name: 'Broadcaster' })
  expect(screen.queryByRole('heading', { name: 'Viaplay' })).toBeNull()
})
