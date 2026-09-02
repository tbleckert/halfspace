// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  writeCompetitionSeasonsRefresh,
  writeSeasonTopscorersRefresh,
  writeTeamRefresh,
  writeTeamSquadRefresh
} from '@/data/db'
import { routeTree } from '@/routeTree.gen'
import { makeTopscorer } from '../../../test/topscorer-fixtures'

vi.mock('@/components/app-shell', async () => {
  const { Outlet } = await import('@tanstack/react-router')
  return { AppShell: Outlet }
})

vi.mock('@/features/credentials/connection-state-provider', () => ({
  ConnectionStateProvider: ({ children }: { children: React.ReactNode }) => children
}))

vi.mock('@/lib/use-online', () => ({ useOnline: () => false }))

beforeEach(async () => {
  await clearSportmonksCache()
  await db.competitions.put({
    id: 271,
    countryId: 752,
    name: 'Allsvenskan',
    active: true,
    imagePath: null,
    currentSeasonId: 25591,
    currentSeasonName: '2026',
    raw: { id: 271, country_id: 752, name: 'Allsvenskan', active: true },
    fetchedAt: Date.now()
  })
  await writeCompetitionSeasonsRefresh(271, {
    seasons: [
      {
        id: 25591,
        league_id: 271,
        name: '2026',
        is_current: true,
        starting_at: '2026-03-01',
        ending_at: '2026-11-01'
      },
      {
        id: 25590,
        league_id: 271,
        name: '2025',
        is_current: false,
        starting_at: '2025-03-01',
        ending_at: '2025-11-01'
      }
    ],
    fetchedAt: Date.now(),
    pageCount: 1
  })
  await writeSeasonTopscorersRefresh(25591, {
    topscorers: [
      makeTopscorer(),
      makeTopscorer({ id: 2, type_id: 209, total: 7 }),
      makeTopscorer({
        id: 3,
        type_id: 209,
        player_id: 101,
        position: 2,
        total: 7,
        player: { ...makeTopscorer().player!, id: 101, display_name: 'Jamie Midfielder' }
      })
    ],
    fetchedAt: Date.now(),
    pageCount: 1
  })
  await writeSeasonTopscorersRefresh(25590, {
    topscorers: [makeTopscorer({ season_id: 25590, total: 20 })],
    fetchedAt: Date.now(),
    pageCount: 1
  })
})

afterAll(() => db.close())

describe('competition season navigation', () => {
  it('switches historical squads offline while retaining team navigation and player context', async () => {
    await writeTeamRefresh({
      fetchedAt: Date.now(),
      team: {
        id: 9,
        sport_id: 1,
        country_id: 752,
        name: 'Test club',
        venue_id: null,
        gender: 'male',
        founded: null,
        placeholder: false
      }
    })
    const entry = {
      id: 123,
      transfer_id: null,
      player_id: 100,
      team_id: 9,
      position_id: 27,
      detailed_position_id: null,
      jersey_number: 9,
      start: null,
      end: null,
      player: makeTopscorer().player!
    }
    await writeTeamSquadRefresh(9, { fetchedAt: Date.now(), squad: [entry] }, 25591)
    await writeTeamSquadRefresh(
      9,
      { fetchedAt: Date.now(), squad: [{ ...entry, jersey_number: 19 }] },
      25590
    )
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({
        initialEntries: ['/teams/9/squad?competition=271&season=25591']
      })
    })
    render(<RouterProvider router={router} />)
    await screen.findByRole('link', { name: /Alex Forward/ })
    await screen.findByRole('option', { name: '2025' })
    fireEvent.change(screen.getByRole('combobox', { name: 'Squad season' }), {
      target: { value: '25590' }
    })
    await waitFor(() => expect(router.state.location.search.season).toBe(25590))
    expect(router.state.location.pathname).toBe('/teams/9/squad')
    await screen.findByText('19')
    expect(screen.getByRole('link', { name: /Alex Forward/ }).getAttribute('href')).toContain(
      'season=25590'
    )
    fireEvent.change(screen.getByRole('combobox', { name: 'Squad season' }), {
      target: { value: '' }
    })
    await screen.findByText('Squad not available offline')
    expect(router.state.location.search.season).toBeUndefined()
  })

  it('opens the full assist leaderboard from the overview with its season context', async () => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({
        initialEntries: ['/competitions/271?date=2026-09-02&season=25591']
      })
    })
    render(<RouterProvider router={router} />)

    const goals = await screen.findByRole('region', { name: 'Top scorer' })
    const assists = await screen.findByRole('region', { name: 'Top assists' })
    expect(
      within(goals).getByRole('link', { name: 'Alex Forward' }).getAttribute('href')
    ).toContain('season=25591')
    expect(within(assists).getByText('Shared lead · 2 players')).toBeTruthy()
    fireEvent.click(within(assists).getByRole('link', { name: 'View assists leaderboard' }))

    expect(await screen.findByRole('table', { name: 'Assists leaders' })).toBeTruthy()
    expect(router.state.location.search).toMatchObject({
      season: 25591,
      date: '2026-09-02',
      leaderboard: 'assists'
    })

    fireEvent.change(screen.getByRole('combobox', { name: 'Player leaderboard' }), {
      target: { value: 'goals' }
    })
    expect(await screen.findByRole('table', { name: 'Goals leaders' })).toBeTruthy()
    await act(() => router.history.back())
    expect(await screen.findByRole('table', { name: 'Assists leaders' })).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox', { name: 'Season' }), {
      target: { value: '25590' }
    })
    expect(await screen.findByText('No leaders for this season')).toBeTruthy()
    expect(router.state.location.search).toMatchObject({ season: 25590, leaderboard: 'assists' })
  })

  it('updates cached overview highlights with the season and hides unavailable categories', async () => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({
        initialEntries: ['/competitions/271?date=2026-09-02&season=25591']
      })
    })
    render(<RouterProvider router={router} />)
    await screen.findByRole('region', { name: 'Top assists' })
    fireEvent.change(screen.getByRole('combobox', { name: 'Season' }), {
      target: { value: '25590' }
    })
    await waitFor(() => {
      expect(
        within(screen.getByRole('region', { name: 'Top scorer' })).getByText('20')
      ).toBeTruthy()
    })
    const goals = screen.getByRole('region', { name: 'Top scorer' })
    expect(screen.queryByRole('region', { name: 'Top assists' })).toBeNull()
    expect(
      within(goals).getByRole('link', { name: 'Alex Forward' }).getAttribute('href')
    ).toContain('season=25590')
  })

  it.each(['stats', 'fixtures', 'teams'])(
    'keeps the %s view open when changing season',
    async (view) => {
      const router = createRouter({
        routeTree,
        history: createMemoryHistory({
          initialEntries: [`/competitions/271/${view}?date=2026-09-02&season=25591`]
        })
      })
      render(<RouterProvider router={router} />)

      const select = await screen.findByRole('combobox', { name: 'Season' })
      fireEvent.change(select, { target: { value: '25590' } })

      await waitFor(() => expect(router.state.location.search.season).toBe(25590))
      expect(router.state.location.pathname).toBe(`/competitions/271/${view}`)
      expect(router.state.location.search.date).toBe('2025-11-01')

      if (view === 'stats') {
        expect(await screen.findByRole('table', { name: 'Goals leaders' })).toBeTruthy()
        expect(await screen.findByText('20')).toBeTruthy()
        expect(screen.getByRole('link', { name: 'Alex Forward' }).getAttribute('href')).toContain(
          'season=25590'
        )
      }
    }
  )
})
