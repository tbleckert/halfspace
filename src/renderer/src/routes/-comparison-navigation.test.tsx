// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  writeStatisticSeasonsRefresh,
  writeEntitySearchRefresh,
  writePlayerStatisticsRefresh,
  writeTeamStatisticsRefresh
} from '@/data/db'
import { routeTree } from '@/routeTree.gen'
import { makeTopscorer } from '../../../test/topscorer-fixtures'

vi.mock('@/components/app-shell', async () => ({
  AppShell: (await import('@tanstack/react-router')).Outlet
}))
vi.mock('@/features/credentials/connection-state-provider', () => ({
  ConnectionStateProvider: ({ children }: { children: React.ReactNode }) => children
}))
vi.mock('@/lib/use-online', () => ({ useOnline: () => false }))
beforeEach(async () => {
  await clearSportmonksCache()
  const fetchedAt = Date.now()
  const current = { id: 12, league_id: 8, name: '2026/27', is_current: true }
  const italianSeason = { ...current, id: 22, league_id: 384 }
  const previous = { ...current, id: 11, name: '2025/26', is_current: false }
  for (const [teamId, teamName] of [
    [19, 'Arsenal'],
    [8, 'Liverpool']
  ] as const) {
    await writeStatisticSeasonsRefresh(
      { entity: 'teams', entityId: teamId },
      {
        records: [current, previous].map((season) => ({
          season,
          competitionName: 'Premier League',
          teamId,
          teamName
        })),
        fetchedAt
      }
    )
  }
  for (const entityId of [100, 101]) {
    await writeStatisticSeasonsRefresh(
      { entity: 'players', entityId },
      {
        records: [
          ...[current, previous].map((season) => ({
            season,
            competitionName: 'Premier League',
            teamId: 19,
            teamName: 'Arsenal'
          })),
          { season: italianSeason, competitionName: 'Serie A', teamId: 8, teamName: 'Liverpool' }
        ],
        fetchedAt
      }
    )
  }
  await writeEntitySearchRefresh({
    competitions: [],
    coaches: [],
    venues: [],
    referees: [],
    fixtures: [],
    teams: [
      { ...makeTopscorer().participant!, id: 19, name: 'Arsenal' },
      { ...makeTopscorer().participant!, id: 8, name: 'Liverpool' }
    ],
    players: [
      makeTopscorer().player!,
      { ...makeTopscorer().player!, id: 101, display_name: 'Jamie Midfielder' }
    ],
    fetchedAt
  })
})
afterAll(() => db.close())

it('compares cached teams, swaps sides, and never leaks a previous season into the next', async () => {
  for (const [teamId, count] of [
    [19, 0],
    [8, 3]
  ]) {
    await writeTeamStatisticsRefresh(
      { teamId, seasonId: 12 },
      {
        fetchedAt: Date.now(),
        statistics: [{ id: teamId, team_statistic_id: 1, type_id: 52, value: { all: { count } } }]
      }
    )
  }
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: ['/compare?kind=teams&leftSeason=12&rightSeason=12&left=19&right=8']
    })
  })
  render(<RouterProvider router={router} />)
  const table = await screen.findByRole('table', { name: 'Season comparison' })
  const row = await within(table).findByRole('row', { name: '0 Goals 3' })
  expect(row).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Arsenal' }).getAttribute('href')).toContain('season=12')
  fireEvent.click(screen.getByRole('button', { name: 'Swap selections' }))
  await screen.findByRole('row', { name: '3 Goals 0' })
  expect(router.state.location.search.left).toBe(8)
  fireEvent.change(screen.getByRole('combobox', { name: 'First season' }), {
    target: { value: '2025/2026' }
  })
  await screen.findByText('Some statistics are not available offline')
  expect(screen.queryByRole('row', { name: '3 Goals 0' })).toBeNull()
  expect(router.state.location.search.leftSeason).toBe(11)
  expect(router.state.location.search.rightSeason).toBe(12)
})

it('compares an explicit player club record and clears entity selection when changing type', async () => {
  for (const playerId of [100, 101]) {
    await writeStatisticSeasonsRefresh(
      { entity: 'players', entityId: playerId },
      {
        fetchedAt: Date.now(),
        records: [19, 8].map((teamId) => ({
          season: { id: 12, league_id: 8, name: '2026/27', is_current: true },
          competitionName: 'Premier League',
          teamId,
          teamName: teamId === 19 ? 'Arsenal' : 'Liverpool'
        }))
      }
    )
    await writePlayerStatisticsRefresh(
      { playerId, seasonId: 12 },
      {
        fetchedAt: Date.now(),
        statistics: [19, 8].map((teamId) => ({
          id: teamId,
          player_id: playerId,
          team_id: teamId,
          season_id: 12,
          position_id: null,
          jersey_number: null,
          has_values: true,
          details: [
            {
              id: 1,
              player_statistic_id: teamId,
              type_id: 52,
              value: { total: teamId === 19 ? 2 : 7 }
            }
          ]
        }))
      }
    )
  }
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [
        '/compare?kind=players&leftSeason=12&rightSeason=12&left=100&right=101&leftTeam=19&rightTeam=8'
      ]
    })
  })
  render(<RouterProvider router={router} />)
  await screen.findByRole('row', { name: '2 Goals 7' })
  fireEvent.change(screen.getByRole('combobox', { name: 'First record' }), {
    target: { value: '12:8' }
  })
  await screen.findByRole('row', { name: '7 Goals 7' })
  expect(router.state.location.search.leftTeam).toBe(8)
  expect(screen.getByRole('link', { name: 'Alex Forward' }).getAttribute('href')).toContain(
    'team=8'
  )
  fireEvent.click(screen.getByRole('link', { name: 'Teams' }))
  await screen.findByText('Choose two teams to compare')
  expect(router.state.location.search.left).toBeUndefined()
  expect(router.state.location.search.leftTeam).toBeUndefined()
  expect(screen.queryByRole('table', { name: 'Season comparison' })).toBeNull()
})

it('selects cached entities from the keyboard-friendly picker while offline', async () => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/compare'] })
  })
  render(<RouterProvider router={router} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Choose first team' }))
  expect(screen.queryByRole('combobox', { name: 'First season' })).toBeNull()
  const input = await screen.findByPlaceholderText('Search teams')
  fireEvent.change(input, { target: { value: 'Arsenal' } })
  await screen.findByRole('option', { name: /Arsenal/ })
  fireEvent.keyDown(input, { key: 'Enter' })
  await screen.findByRole('link', { name: 'Arsenal' })
  expect(router.state.location.search.left).toBe(19)
  await screen.findByRole('combobox', { name: 'First season' })
  await waitFor(() => expect(router.state.location.search.leftSeason).toBe(12))
  expect(screen.queryByRole('combobox', { name: 'First record' })).toBeNull()
  expect(screen.getByText('Premier League')).toBeTruthy()
  await act(() =>
    router.navigate({
      to: '/compare',
      search: { kind: 'players' }
    })
  )
  expect(screen.queryByRole('link', { name: 'Arsenal' })).toBeNull()
})

it('compares the same player across leagues and seasons, preserving each side when swapped', async () => {
  for (const [seasonId, teamId, count] of [
    [12, 19, 2],
    [22, 8, 7],
    [11, 19, 4]
  ]) {
    await writePlayerStatisticsRefresh(
      { playerId: 100, seasonId },
      {
        fetchedAt: Date.now(),
        statistics: [
          {
            id: seasonId,
            player_id: 100,
            team_id: teamId,
            season_id: seasonId,
            position_id: null,
            jersey_number: null,
            has_values: true,
            details: [
              { id: 1, player_statistic_id: seasonId, type_id: 52, value: { total: count } }
            ]
          }
        ]
      }
    )
  }
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [
        '/compare?kind=players&left=100&right=100&leftSeason=12&rightSeason=22&leftTeam=19&rightTeam=8'
      ]
    })
  })
  render(<RouterProvider router={router} />)
  await screen.findByRole('row', { name: '2 Goals 7' })
  fireEvent.change(screen.getByRole('combobox', { name: 'First season' }), {
    target: { value: '2025/2026' }
  })
  await screen.findByRole('row', { name: '4 Goals 7' })
  expect(router.state.location.search.rightSeason).toBe(22)
  expect(router.state.location.search.rightTeam).toBe(8)
  fireEvent.click(screen.getByRole('button', { name: 'Swap selections' }))
  await screen.findByRole('row', { name: '7 Goals 4' })
  expect(router.state.location.search).toMatchObject({
    left: 100,
    right: 100,
    leftSeason: 22,
    leftTeam: 8,
    rightSeason: 11
  })
  fireEvent.change(screen.getByRole('combobox', { name: 'First record' }), {
    target: { value: '12:19' }
  })
  await screen.findByRole('row', { name: '2 Goals 4' })
  expect(router.state.location.search.leftTeam).toBe(19)
  expect(router.state.location.search.rightSeason).toBe(11)
})

it('allows selecting the same player on both sides', async () => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: ['/compare?kind=players&left=100&leftSeason=12']
    })
  })
  render(<RouterProvider router={router} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Choose second player' }))
  const input = await screen.findByPlaceholderText('Search players')
  fireEvent.change(input, { target: { value: 'Alex' } })
  await screen.findByRole('option', { name: /Alex Forward/ })
  fireEvent.keyDown(input, { key: 'Enter' })
  await waitFor(() => expect(router.state.location.search.right).toBe(100))
  await waitFor(() => expect(screen.getAllByRole('link', { name: 'Alex Forward' })).toHaveLength(2))
})

it('resolves the new entity independently without carrying its predecessor’s season or club', async () => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [
        '/compare?kind=players&left=100&leftSeason=11&leftTeam=19&right=101&rightSeason=22&rightTeam=8'
      ]
    })
  })
  render(<RouterProvider router={router} />)
  await screen.findByRole('combobox', { name: 'First season' })
  fireEvent.click(screen.getByRole('button', { name: 'Choose first player' }))
  const input = await screen.findByPlaceholderText('Search players')
  fireEvent.change(input, { target: { value: 'Jamie' } })
  await screen.findByRole('option', { name: /Jamie Midfielder/ })
  fireEvent.keyDown(input, { key: 'Enter' })
  await waitFor(() =>
    expect(router.state.location.search).toMatchObject({
      left: 101,
      leftSeason: 12,
      leftTeam: 19,
      right: 101,
      rightSeason: 22,
      rightTeam: 8
    })
  )
})

it('does not substitute another record when an explicit season is unavailable', async () => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [
        '/compare?kind=players&left=100&leftSeason=999&leftTeam=19&right=101&rightSeason=22&rightTeam=8'
      ]
    })
  })
  render(<RouterProvider router={router} />)
  await screen.findByText('The selected record is not available')
  expect(screen.queryByRole('table', { name: 'Season comparison' })).toBeNull()
  expect(router.state.location.search.leftSeason).toBe(999)
  fireEvent.change(screen.getByRole('combobox', { name: 'First season' }), {
    target: { value: '2025/2026' }
  })
  await screen.findByRole('table', { name: 'Season comparison' })
  expect(router.state.location.search).toMatchObject({
    leftSeason: 11,
    leftTeam: 19,
    rightSeason: 22,
    rightTeam: 8
  })
})
