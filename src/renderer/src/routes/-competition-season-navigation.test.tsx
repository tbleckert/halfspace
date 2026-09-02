// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  writeCompetitionSeasonsRefresh,
  writeSeasonTopscorersRefresh
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
    topscorers: [makeTopscorer()],
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
