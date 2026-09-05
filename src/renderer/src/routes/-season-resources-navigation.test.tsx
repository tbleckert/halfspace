// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  writeCompetitionDetailRefresh,
  writeCompetitionSeasonsRefresh,
  writeTeamCompetitionsRefresh,
  writeTeamRefresh
} from '@/data/db'
import {
  writeSeasonRefereesRefresh,
  writeSeasonVenuesRefresh,
  writeStandingCorrectionsRefresh,
  writeTeamScheduleRefresh
} from '@/data/season-resources-cache'
import { writeTransferRumoursRefresh } from '@/data/transfer-rumours-cache'
import { routeTree } from '@/routeTree.gen'

vi.mock('@/components/app-shell', async () => ({
  AppShell: (await import('@tanstack/react-router')).Outlet
}))
vi.mock('@/features/credentials/connection-state-provider', () => ({
  ConnectionStateProvider: ({ children }: { children: React.ReactNode }) => children
}))
vi.mock('@/lib/use-online', () => ({ useOnline: () => false }))

const fetchedAt = Date.now()
const current = { id: 12, league_id: 8, name: '2026/27', is_current: true }
const previous = { id: 11, league_id: 8, name: '2025/26', is_current: false }
const competition = {
  id: 8,
  country_id: 1,
  name: 'Example League',
  active: true,
  currentseason: current
}
const team = {
  id: 4,
  name: 'Example Club',
  sport_id: 1,
  country_id: 1,
  venue_id: null,
  founded: null,
  gender: 'male',
  placeholder: false
}

beforeEach(async () => {
  await clearSportmonksCache()
  await writeCompetitionDetailRefresh(8, { competition, fetchedAt })
  await writeCompetitionSeasonsRefresh(8, { seasons: [current, previous], fetchedAt, pageCount: 1 })
  await writeTeamRefresh({ team, fetchedAt })
  await writeTeamCompetitionsRefresh(4, {
    teamId: 4,
    competitions: [competition],
    fetchedAt,
    pageCount: 1
  })
})
afterAll(() => db.close())

function open(path: string): ReturnType<typeof createRouter<typeof routeTree>> {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] })
  })
  render(<RouterProvider router={router} />)
  return router
}

it('changes season within the referee view and preserves context on profile and return links', async () => {
  await writeSeasonRefereesRefresh(12, {
    seasonId: 12,
    referees: [
      { id: 1, name: 'Current Official', display_name: 'Current Official', country_id: null }
    ],
    fetchedAt
  })
  await writeSeasonRefereesRefresh(11, {
    seasonId: 11,
    referees: [{ id: 2, name: 'Past Official', display_name: 'Past Official', country_id: null }],
    fetchedAt
  })
  const router = open('/competitions/8/referees?season=12')
  expect(await screen.findByRole('link', { name: 'Current Official' })).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox', { name: 'Season' }), { target: { value: '11' } })
  const link = await screen.findByRole('link', { name: 'Past Official' })
  expect(screen.queryByRole('link', { name: 'Current Official' })).toBeNull()
  expect(router.state.location.pathname).toBe('/competitions/8/referees')
  fireEvent.click(link)
  await waitFor(() => expect(router.state.location.pathname).toBe('/referees/2'))
  expect(router.state.location.search).toMatchObject({
    competition: 8,
    season: 11,
    statsSeason: 11
  })
  fireEvent.click(await screen.findByRole('link', { name: 'Referees' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/competitions/8/referees'))
  expect(router.state.location.search.season).toBe(11)
})

it('shows season venues and retains the season on the return journey', async () => {
  await writeSeasonVenuesRefresh(11, {
    seasonId: 11,
    venues: [{ id: 3, name: 'Riverside', city_name: 'City', capacity: 40000 }],
    fetchedAt
  })
  const router = open('/competitions/8/venues?season=11')
  fireEvent.click(await screen.findByRole('link', { name: /Riverside/ }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/venues/3'))
  expect(router.state.location.search.season).toBe(11)
  fireEvent.click(await screen.findByRole('link', { name: 'Venues' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/competitions/8/venues'))
  expect(router.state.location.search.season).toBe(11)
})

it('browses completed schedule matches without a state include and resets the stage when switching seasons', async () => {
  const fixture = {
    id: 10,
    league_id: 8,
    season_id: 12,
    stage_id: 2,
    state_id: 5,
    starting_at_timestamp: 1788696000,
    placeholder: false,
    has_odds: false,
    participants: [
      { id: 4, name: 'Example Club', meta: { location: 'home' as const } },
      { id: 5, name: 'Other Club', meta: { location: 'away' as const } }
    ],
    scores: []
  }
  await writeTeamScheduleRefresh(
    { teamId: 4, seasonId: 12 },
    {
      teamId: 4,
      seasonId: 12,
      fetchedAt,
      stages: [
        {
          id: 2,
          season_id: 12,
          name: 'Regular season',
          sort_order: 1,
          finished: false,
          is_current: true,
          fixtures: [fixture],
          rounds: []
        }
      ]
    }
  )
  await writeTeamScheduleRefresh(
    { teamId: 4, seasonId: 11 },
    { teamId: 4, seasonId: 11, fetchedAt, stages: [] }
  )
  const router = open('/teams/4/schedule?competition=8&season=12&stage=2')
  const match = await screen.findByRole('link', { name: /Other Club/ })
  expect(match.getAttribute('href')).toContain('season=12')
  expect(await screen.findByText('FT')).toBeTruthy()
  expect(screen.queryByText('Scheduled')).toBeNull()
  await screen.findByRole('option', { name: '2025/26' })
  fireEvent.change(screen.getByRole('combobox', { name: 'Schedule season' }), {
    target: { value: '11' }
  })
  await waitFor(() => expect(router.state.location.search.season).toBe(11))
  expect(router.state.location.pathname).toBe('/teams/4/schedule')
  expect(router.state.location.search.stage).toBeUndefined()
  await waitFor(() => expect(screen.queryByRole('link', { name: /Other Club/ })).toBeNull())
})

it('shows signed adjustments without claiming inactive or unknown corrections are deductions', async () => {
  const row = {
    id: 1,
    season_id: 12,
    stage_id: 2,
    group_id: null,
    type_id: 173,
    value: 3,
    calc_type: '-',
    participant_type: 'team',
    participant_id: 4,
    active: true,
    participant: team
  }
  await writeStandingCorrectionsRefresh(12, {
    seasonId: 12,
    fetchedAt,
    corrections: [row, { ...row, id: 2, calc_type: null, active: false }]
  })
  open('/competitions/8/table?season=12')
  expect(await screen.findByText('−3')).toBeTruthy()
  expect(screen.getByText('Inactive')).toBeTruthy()
  expect(screen.getByText('Direction unreported')).toBeTruthy()
  expect(await db.standings.count()).toBe(0)
})

it('browses cached rumour pages with explicit pagination and safe source links', async () => {
  const input = { entity: 'teams' as const, entityId: 4, page: 1 }
  const rumour = {
    id: 1,
    player_id: 7,
    from_team_id: 4,
    to_team_id: 5,
    type_id: null,
    probability: 'LOW',
    source_name: 'Paper',
    source_url: 'https://example.com/story',
    amount: 100,
    currency: null,
    date: '2026-09-01',
    fromTeam: team,
    toTeam: { ...team, id: 5, name: 'Destination' }
  }
  await writeTransferRumoursRefresh(input, {
    ...input,
    fetchedAt,
    rumours: [rumour],
    hasMore: true
  })
  await writeTransferRumoursRefresh(
    { ...input, page: 2 },
    { ...input, page: 2, fetchedAt, rumours: [], hasMore: false }
  )
  const router = open('/teams/4/rumours?competition=8&season=12')
  expect(await screen.findByText('Likelihood: LOW')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Paper' }).getAttribute('href')).toBe(
    'https://example.com/story'
  )
  expect(screen.queryByText(/Reported fee/)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Next rumour page' }))
  expect(await screen.findByText('No rumours on this page')).toBeTruthy()
  expect(router.state.location.search).toMatchObject({ season: 12, rumourPage: 2 })
  expect(screen.queryByText('Likelihood: LOW')).toBeNull()
  await act(() =>
    router.navigate({
      to: '/teams/$teamId/rumours',
      params: { teamId: '4' },
      search: { competition: 8, season: 12, rumourPage: 1 }
    })
  )
  expect(await screen.findByText('Likelihood: LOW')).toBeTruthy()
})
