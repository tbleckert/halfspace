// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  writeCompetitionDetailRefresh,
  writeCompetitionSeasonsRefresh,
  writeSeasonTeamsRefresh,
  writeTeamCompetitionsRefresh,
  writeTeamRefresh
} from '@/data/db'
import { routeTree } from '@/routeTree.gen'

const connection = vi.hoisted(() => ({ online: false }))
vi.mock('@/components/app-shell', async () => ({
  AppShell: (await import('@tanstack/react-router')).Outlet
}))
vi.mock('@/features/credentials/connection-state-provider', () => ({
  ConnectionStateProvider: ({ children }: { children: React.ReactNode }) => children
}))
vi.mock('@/lib/use-online', () => ({ useOnline: () => connection.online }))

const current = { id: 10, league_id: 8, name: '2026/27', is_current: true }
const previous = { id: 9, league_id: 8, name: '2025/26', is_current: false }
const competition = {
  id: 8,
  country_id: 1,
  name: 'Example Cup',
  active: true,
  currentseason: current
}
const team = {
  id: 1,
  name: 'Cup Club',
  country_id: 1,
  sport_id: 1,
  venue_id: null,
  founded: null,
  gender: 'male',
  placeholder: false,
  country: { id: 1, name: 'England' }
}

beforeEach(async () => {
  connection.online = false
  await clearSportmonksCache()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.close())

function open(path: string): ReturnType<typeof createRouter<typeof routeTree>> {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] })
  })
  render(<RouterProvider router={router} />)
  return router
}

it('shows complete season teams without any cached fixtures or standings and keeps season context in links', async () => {
  const fetchedAt = Date.now()
  await writeCompetitionDetailRefresh(8, { competition, fetchedAt })
  await writeCompetitionSeasonsRefresh(8, { seasons: [current, previous], fetchedAt, pageCount: 1 })
  await writeSeasonTeamsRefresh(10, { seasonId: 10, teams: [team], fetchedAt, pageCount: 1 })
  await writeSeasonTeamsRefresh(9, {
    seasonId: 9,
    teams: [{ ...team, id: 2, name: 'Previous Club' }],
    fetchedAt,
    pageCount: 1
  })
  const router = open('/competitions/8/teams?season=10')
  expect(await screen.findByRole('link', { name: 'Cup Club England' })).toBeTruthy()
  await act(() =>
    router.navigate({
      to: '/competitions/$competitionId/teams',
      params: { competitionId: '8' },
      search: { season: 9 }
    })
  )
  const link = await screen.findByRole('link', { name: 'Previous Club England' })
  expect(screen.queryByRole('link', { name: 'Cup Club England' })).toBeNull()
  fireEvent.click(link)
  await waitFor(() => expect(router.state.location.pathname).toBe('/teams/2'))
  expect(router.state.location.search).toMatchObject({ competition: 8, season: 9 })
})

it('shows current cup membership independently of the historical season on the team page', async () => {
  const fetchedAt = Date.now()
  await writeTeamRefresh({ team, fetchedAt })
  await writeTeamCompetitionsRefresh(1, {
    teamId: 1,
    competitions: [competition],
    fetchedAt,
    pageCount: 1
  })
  await writeCompetitionSeasonsRefresh(8, { seasons: [current, previous], fetchedAt, pageCount: 1 })
  const router = open('/teams/1?competition=8&season=9')
  const heading = await screen.findByRole('heading', { name: 'Current competitions' })
  const card = heading.closest('section')!
  const link = await within(card).findByRole('link', { name: 'Example Cup 2026/27' })
  fireEvent.click(link)
  await waitFor(() => expect(router.state.location.pathname).toBe('/competitions/8'))
  expect(router.state.location.search).toMatchObject({ season: 10 })
})

it('opens an uncached competition directly through its typed API', async () => {
  connection.online = true
  const fetchedAt = Date.now()
  const refreshCompetition = vi
    .fn()
    .mockResolvedValue({ ok: true, data: { competition, fetchedAt } })
  vi.stubGlobal('halfspace', {
    sportmonks: {
      refreshCompetition,
      refreshCompetitionSeasons: vi
        .fn()
        .mockResolvedValue({ ok: true, data: { seasons: [current], fetchedAt, pageCount: 1 } }),
      refreshSeasonTeams: vi.fn().mockResolvedValue({
        ok: true,
        data: { seasonId: 10, teams: [team], fetchedAt, pageCount: 1 }
      }),
      refreshCompetitionFixtures: vi.fn().mockResolvedValue({
        ok: true,
        data: { fixtures: [], fetchedAt, pageCount: 1, timeZone: 'UTC' }
      }),
      refreshStandings: vi.fn().mockResolvedValue({ ok: true, data: { standings: [], fetchedAt } })
    }
  })
  open('/competitions/8/teams?season=10')
  expect(await screen.findByRole('heading', { name: 'Example Cup' })).toBeTruthy()
  expect(await screen.findByRole('link', { name: 'Cup Club England' })).toBeTruthy()
  expect(refreshCompetition).toHaveBeenCalledWith({ competitionId: 8 })
  expect(await db.competitionCatalogs.count()).toBe(0)
})
