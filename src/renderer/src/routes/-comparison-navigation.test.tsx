// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  writeCompetitionRefresh,
  writeCompetitionSeasonsRefresh,
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
  await writeCompetitionRefresh({
    competitions: [
      { id: 8, country_id: 1, name: 'Premier League', active: true, currentseason: current }
    ],
    fetchedAt,
    pageCount: 1
  })
  await writeCompetitionSeasonsRefresh(8, {
    seasons: [current, { ...current, id: 11, name: '2025/26', is_current: false }],
    fetchedAt,
    pageCount: 1
  })
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
      initialEntries: ['/compare?kind=teams&competition=8&season=12&left=19&right=8']
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
  fireEvent.change(screen.getByRole('combobox', { name: 'Comparison season' }), {
    target: { value: '11' }
  })
  await screen.findByText('Some statistics are not available offline')
  expect(screen.queryByRole('row', { name: '3 Goals 0' })).toBeNull()
  expect(router.state.location.search.season).toBe(11)
})

it('compares an explicit player club record and clears entity selection when changing type', async () => {
  for (const playerId of [100, 101]) {
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
        '/compare?kind=players&competition=8&season=12&left=100&right=101&leftTeam=19&rightTeam=8'
      ]
    })
  })
  render(<RouterProvider router={router} />)
  await screen.findByRole('row', { name: '2 Goals 7' })
  fireEvent.change(screen.getByRole('combobox', { name: "First player's club" }), {
    target: { value: '8' }
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
    history: createMemoryHistory({ initialEntries: ['/compare?competition=8&season=12'] })
  })
  render(<RouterProvider router={router} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Choose first team' }))
  const input = await screen.findByPlaceholderText('Search teams')
  fireEvent.change(input, { target: { value: 'Arsenal' } })
  await screen.findByRole('option', { name: /Arsenal/ })
  fireEvent.keyDown(input, { key: 'Enter' })
  await screen.findByRole('link', { name: 'Arsenal' })
  expect(router.state.location.search.left).toBe(19)
  await act(() =>
    router.navigate({ to: '/compare', search: { kind: 'players', competition: 8, season: 12 } })
  )
  expect(screen.queryByRole('link', { name: 'Arsenal' })).toBeNull()
})
