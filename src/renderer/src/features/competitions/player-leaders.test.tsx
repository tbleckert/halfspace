// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider
} from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { makeTopscorer } from '../../../../test/topscorer-fixtures'
import { PlayerLeaders } from './player-leaders'
import type { SportmonksTopscorer } from '@shared/contracts'

function showLeaders(topscorers: SportmonksTopscorer[] | null, loading = false): void {
  const root = createRootRoute()
  const index = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => (
      <PlayerLeaders
        competitionId={271}
        date="2026-09-02"
        seasonId={25591}
        online={false}
        loaded
        loading={loading}
        topscorers={topscorers}
      />
    )
  })
  const player = createRoute({ getParentRoute: () => root, path: '/players/$playerId' })
  const team = createRoute({ getParentRoute: () => root, path: '/teams/$teamId' })
  const router = createRouter({
    routeTree: root.addChildren([index, player, team]),
    history: createMemoryHistory({ initialEntries: ['/'] })
  })
  render(<RouterProvider router={router} />)
}

describe('player leaderboards', () => {
  it('switches categories, preserves tied ranks, and links to players and clubs with season context', async () => {
    showLeaders([
      makeTopscorer({
        id: 2,
        player_id: 101,
        position: 3,
        total: 8,
        player: { ...makeTopscorer().player!, id: 101, display_name: 'Sam Striker' }
      }),
      makeTopscorer(),
      makeTopscorer({
        id: 3,
        player_id: 102,
        position: 1,
        total: 12,
        player: { ...makeTopscorer().player!, id: 102, display_name: 'Jamie Forward' }
      }),
      makeTopscorer({ id: 4, type_id: 209, total: 7 }),
      makeTopscorer({ id: 5, type_id: 84, total: 6 }),
      makeTopscorer({ id: 6, type_id: 83, total: 1 })
    ])
    const table = await screen.findByRole('table', { name: 'Goals leaders' })
    const ranks = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[0].textContent)
    expect(ranks).toEqual(['1', '1', '3'])
    expect(screen.getByRole('link', { name: 'Alex Forward' }).getAttribute('href')).toBe(
      '/players/100?competition=271&date=2026-09-02&season=25591&team=37'
    )
    expect(screen.getAllByRole('link', { name: 'Halfspace FC' })[0].getAttribute('href')).toContain(
      'season=25591'
    )

    const select = screen.getByRole('combobox', { name: 'Player leaderboard' })
    fireEvent.change(select, { target: { value: '209' } })
    expect(
      within(screen.getByRole('table', { name: 'Assists leaders' })).getByText('7')
    ).toBeTruthy()
    fireEvent.change(select, { target: { value: '84' } })
    expect(
      within(screen.getByRole('table', { name: 'Yellow cards leaders' })).getByText('6')
    ).toBeTruthy()
    fireEvent.change(select, { target: { value: '83' } })
    expect(
      within(screen.getByRole('table', { name: 'Red cards leaders' })).getAllByRole('row')
    ).toHaveLength(2)
  })

  it('keeps cached leaders visible during refresh and tolerates missing player/team relationships', async () => {
    showLeaders([makeTopscorer({ player: null, participant: null, participant_id: null })], true)
    expect(await screen.findByRole('link', { name: 'Player 100' })).toBeTruthy()
    expect(screen.getByRole('table', { name: 'Goals leaders' })).toBeTruthy()
  })

  it('distinguishes an empty season from data never cached while offline', async () => {
    showLeaders([])
    expect(await screen.findByText('No leaders for this season')).toBeTruthy()
  })

  it('shows an offline state without hiding the category control', async () => {
    showLeaders(null)
    expect(await screen.findByText('Player leaders not available offline')).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Player leaderboard' })).toBeTruthy()
  })
})
