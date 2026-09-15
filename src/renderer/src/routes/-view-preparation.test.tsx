// @vitest-environment jsdom
import { selectOption } from '../../../test/select-option'
import { viewBlockTypes } from '@/features/views/view-editing'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  writeTeamRefresh,
  writeTeamFixtureRefresh,
  writeFixtureDetailRefresh,
  writeFixtureHeadToHeadRefresh,
  writeTeamSquadRefresh,
  writeTeamTransfersRefresh,
  writeCompetitionRefresh,
  writeCompetitionSeasonsRefresh,
  writeTeamCompetitionsRefresh
} from '@/data/db'
import type { SportmonksFixture, SportmonksPlayer, SportmonksTransfer } from '@shared/contracts'
import type { ViewSpec } from '@shared/views'
import { routeTree } from '@/routeTree.gen'
import { mockViewsApi } from '../../../test/view-api'
import { saveView } from '@/features/views/saved-views'
import { teamViewFixtureInput } from '@/features/views/team-view-data'
import { recentViewTransfers } from '@/features/views/team-roster-data'
import { currentTimeZone, todayInTimeZone, addDaysToIsoDate } from '@/lib/date'

vi.mock('@/components/app-shell', async () => ({
  AppShell: (await import('@tanstack/react-router')).Outlet
}))
vi.mock('@/features/credentials/connection-state-provider', () => ({
  ConnectionStateProvider: ({ children }: { children: React.ReactNode }) => children
}))
const connection = vi.hoisted(() => ({ online: false }))
vi.mock('@/lib/use-online', () => ({ useOnline: () => connection.online }))
const timeZone = currentTimeZone()
const today = todayInTimeZone(timeZone)
const spec: ViewSpec = {
  version: 3,
  title: 'Match preparation',
  message: '',
  blocks: [
    { id: 'next', type: 'team-next-match', teamId: 19, span: 2 },
    { id: 'meetings', type: 'fixture-head-to-head', fixtureSourceBlockId: 'next', span: 2 },
    { id: 'absences', type: 'fixture-absences', fixtureSourceBlockId: 'next', span: 1 },
    { id: 'weather', type: 'fixture-weather', fixtureSourceBlockId: 'next', span: 3 },
    { id: 'squad', type: 'team-squad', teamId: 19, competitionId: 8, seasonId: 12, span: 2 },
    { id: 'transfers', type: 'team-transfers', teamId: 19, direction: 'all', span: 1 }
  ]
}
const competition = {
  id: 8,
  country_id: 1,
  active: true,
  name: 'Premier League',
  currentseason: { id: 12, league_id: 8, name: '2026/27', is_current: true }
}
function player(id: number, name = `Player ${id}`): SportmonksPlayer {
  return {
    id,
    sport_id: 1,
    country_id: 1,
    nationality_id: 1,
    city_id: null,
    position_id: null,
    detailed_position_id: null,
    type_id: null,
    name,
    display_name: name,
    image_path: null,
    height: null,
    weight: null,
    date_of_birth: null,
    gender: 'male'
  }
}
function fixture(id = 10, home = 19, away = 20): SportmonksFixture {
  return {
    id,
    league_id: 8,
    season_id: 12,
    state_id: 1,
    name: `Match ${id}`,
    starting_at_timestamp: (Date.now() + 86400000) / 1000,
    placeholder: false,
    has_odds: false,
    scores: [],
    participants: [
      { id: home, name: 'Arsenal', meta: { location: 'home' } },
      { id: away, name: 'Chelsea', meta: { location: 'away' } }
    ]
  }
}
function transfer(
  id: number,
  from: number | null,
  to: number | null,
  daysAgo = 2
): SportmonksTransfer {
  return {
    id,
    sport_id: 1,
    player_id: id + 100,
    type_id: 1,
    from_team_id: from,
    to_team_id: to,
    position_id: null,
    detailed_position_id: null,
    date: addDaysToIsoDate(today, -daysAgo),
    career_ended: false,
    completed: true,
    amount: 123456,
    player: player(id + 100, `Move ${id}`)
  }
}
async function matches(fixtures: SportmonksFixture[]): Promise<void> {
  await writeTeamFixtureRefresh(teamViewFixtureInput(19, today, timeZone), {
    timeZone,
    fetchedAt: Date.now(),
    pageCount: 1,
    fixtures
  })
}
function open(): ReturnType<typeof createRouter<typeof routeTree>> {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/views?view=preparation'] })
  })
  render(<RouterProvider router={router} />)
  return router
}
beforeEach(async () => {
  connection.online = false
  window.halfspace = { views: mockViewsApi() } as typeof window.halfspace
  await clearSportmonksCache()
  await db.savedViews.clear()
  const fetchedAt = Date.now()
  await writeCompetitionRefresh({ competitions: [competition], fetchedAt, pageCount: 1 })
  await writeCompetitionSeasonsRefresh(8, {
    seasons: [
      competition.currentseason,
      { id: 13, league_id: 8, name: '2025/26', is_current: false }
    ],
    fetchedAt,
    pageCount: 1
  })
  await writeTeamRefresh({
    fetchedAt,
    team: {
      id: 19,
      name: 'Arsenal',
      country_id: 1,
      sport_id: 1,
      gender: 'male',
      founded: 1886,
      venue_id: null,
      placeholder: false
    }
  })
  await writeTeamCompetitionsRefresh(19, {
    teamId: 19,
    competitions: [competition],
    fetchedAt,
    pageCount: 1
  })
  await matches([fixture()])
  await writeFixtureDetailRefresh({
    fetchedAt: Date.now(),
    fixture: {
      ...fixture(),
      weatherreport: {
        id: 1,
        fixture_id: 10,
        type: 'forecast',
        metric: 'celsius',
        temperature: { current: 0 },
        humidity: '80%',
        description: 'Light snow'
      },
      sidelined: [
        {
          id: 1,
          fixture_id: 10,
          participant_id: 19,
          player_id: 501,
          player: player(501, 'Home Absence')
        },
        {
          id: 2,
          fixture_id: 10,
          participant_id: 20,
          player_id: 502,
          player: player(502, 'Away Absence')
        },
        {
          id: 3,
          fixture_id: 999,
          participant_id: 19,
          player_id: 503,
          player: player(503, 'Wrong Fixture Absence')
        }
      ]
    }
  })
  await writeFixtureHeadToHeadRefresh(
    { firstTeamId: 19, secondTeamId: 20, timeZone },
    {
      fetchedAt,
      timeZone,
      pageCount: 1,
      fixtures: [
        {
          ...fixture(1),
          name: 'Previous meeting',
          state_id: 5,
          starting_at_timestamp: (fetchedAt - 86400000) / 1000
        },
        {
          ...fixture(2, 19, 99),
          name: 'Unrelated pair',
          state_id: 5,
          starting_at_timestamp: (fetchedAt - 86400000) / 1000
        },
        { ...fixture(3), name: 'Future result', state_id: 5 },
        {
          ...fixture(4),
          name: 'Unfinished meeting',
          state_id: 1,
          starting_at_timestamp: (fetchedAt - 86400000) / 1000
        }
      ]
    }
  )
  await writeTeamSquadRefresh(
    19,
    {
      fetchedAt,
      squad: [
        {
          id: 1,
          team_id: 19,
          player_id: 600,
          transfer_id: null,
          position_id: 1,
          detailed_position_id: null,
          jersey_number: null,
          start: null,
          end: null,
          player: player(600, 'Season Player'),
          position: { id: 1, name: 'Goalkeeper' }
        }
      ]
    },
    12
  )
  await writeTeamSquadRefresh(
    19,
    {
      fetchedAt,
      squad: [
        {
          id: 2,
          team_id: 19,
          player_id: 601,
          transfer_id: null,
          position_id: 1,
          detailed_position_id: null,
          jersey_number: 9,
          start: null,
          end: null,
          player: player(601, 'Different Season Player')
        }
      ]
    },
    13
  )
  await writeTeamTransfersRefresh(
    { teamId: 19 },
    {
      fetchedAt,
      pageCount: 1,
      transfers: [
        transfer(1, 20, 19),
        transfer(2, 19, 20, 3),
        { ...transfer(3, 20, 19), completed: false },
        transfer(4, 98, 99),
        transfer(5, 20, 19, 365),
        transfer(6, 20, 19, 364),
        transfer(7, 20, 19, -1)
      ]
    }
  )
  await saveView('preparation', spec)
})
afterAll(() => db.close())

it('renders scoped match details, reported squad roles, and completed transfer history offline', async () => {
  open()
  await screen.findByText('0°C')
  await screen.findByText('Home Absence')
  await screen.findByText('Away Absence')
  await screen.findByText('Season Player')
  await screen.findByText('Goalkeeper')
  await screen.findByText('Move 1')
  await screen.findByText('Move 2')
  const meetings = (await screen.findByRole('heading', { name: 'Head-to-head' })).closest(
    '[data-slot="card"]'
  )!
  const meetingLinks = within(meetings as HTMLElement)
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'))
  expect(meetingLinks).toHaveLength(2)
  expect(meetingLinks[1]).toContain('/fixtures/1?')
  for (const text of [
    'Wrong Fixture Absence',
    'Different Season Player',
    'Move 3',
    'Move 4',
    'Move 5',
    'Move 7',
    'Unrelated pair',
    'Future result',
    'Unfinished meeting',
    '123456'
  ])
    expect(screen.queryByText(text)).toBeNull()
  expect(screen.getByText('Season Player').closest('a')?.getAttribute('href')).toContain(
    'season=12'
  )
  const transfers = await db.transfers.toArray()
  expect(recentViewTransfers(transfers, 19, 'all', today).map(({ id }) => id)).toEqual([1, 2, 6])
  expect(recentViewTransfers(transfers, 19, 'incoming', today).map(({ id }) => id)).toEqual([1, 6])
})

it('follows the next fixture and ignores late details for the previous match', async () => {
  open()
  await screen.findByText('Light snow')
  await act(() => matches([fixture(11)]))
  await screen.findAllByText('Not cached for offline use')
  expect(screen.queryByText('Light snow')).toBeNull()
  await waitFor(() => expect(screen.queryByText('Home Absence')).toBeNull())
  await act(() =>
    writeFixtureDetailRefresh({
      fetchedAt: Date.now() + 1,
      fixture: {
        ...fixture(),
        sidelined: [],
        weatherreport: { id: 2, fixture_id: 10, metric: 'celsius', temperature: { current: 44 } }
      }
    })
  )
  expect(screen.queryByText('44°C')).toBeNull()
  await act(() =>
    writeFixtureDetailRefresh({
      fetchedAt: Date.now() + 2,
      fixture: {
        ...fixture(11),
        sidelined: [],
        weatherreport: {
          id: 3,
          fixture_id: 11,
          type: 'forecast',
          metric: 'unknown',
          temperature: { current: 32 }
        }
      }
    })
  )
  await screen.findAllByText('No absences reported.')
  await screen.findByText('Temperature or its unit is not reported.')
  expect(screen.queryByText('32°C')).toBeNull()
})

it('preserves direction, widths and source bindings through save, reopen, duplicate and undo', async () => {
  const router = open()
  const direction = await screen.findByLabelText('Transfer direction')
  await selectOption(direction, 'Incoming')
  await waitFor(() => expect(screen.queryByText('Move 2')).toBeNull())
  fireEvent.click(screen.getByRole('button', { name: 'Undo change' }))
  await screen.findByText('Move 2')
  await selectOption(screen.getByLabelText('Transfer direction'), 'Outgoing')
  fireEvent.click(screen.getByRole('button', { name: 'Edit blocks' }))
  await selectOption(await screen.findByLabelText('Width of block 4'), '1 column')
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
  await waitFor(async () =>
    expect((await db.savedViews.get('preparation'))?.spec.blocks[5]).toMatchObject({
      direction: 'outgoing'
    })
  )
  await act(() => router.navigate({ to: '/views', search: {} }))
  await act(() => router.navigate({ to: '/views', search: { view: 'preparation' } }))
  await screen.findByText('Move 2')
  fireEvent.click(screen.getByRole('button', { name: 'Duplicate view' }))
  await waitFor(() => expect(router.state.location.search.view).not.toBe('preparation'))
  expect((await db.savedViews.get(router.state.location.search.view!))?.spec.blocks).toEqual(
    spec.blocks.map((block) =>
      block.id === 'weather'
        ? { ...block, span: 1 }
        : block.id === 'transfers'
          ? { ...block, direction: 'outgoing' }
          : block
    )
  )
})

it('adds all five widgets manually and removes their match dependencies together', async () => {
  await db.savedViews.update('preparation', { spec: { ...spec, blocks: [spec.blocks[0]] } })
  open()
  fireEvent.click(await screen.findByRole('button', { name: 'Edit blocks' }))
  const type = await screen.findByLabelText('New block')
  for (const value of [
    'fixture-head-to-head',
    'fixture-absences',
    'fixture-weather',
    'team-squad',
    'team-transfers'
  ]) {
    await selectOption(type, viewBlockTypes.find((item) => item.value === value)!.label)
    fireEvent.click(screen.getByRole('button', { name: 'Add block' }))
  }
  fireEvent.click(screen.getByRole('button', { name: 'Remove block 1' }))
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Match weather' })).toBeNull())
  fireEvent.click(screen.getByRole('button', { name: 'Undo change' }))
  await screen.findByRole('heading', { name: 'Match weather' })
  fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
  await waitFor(async () =>
    expect((await db.savedViews.get('preparation'))?.spec.blocks).toHaveLength(6)
  )
})

it('creates a complete match preparation starter without AI', async () => {
  const router = open()
  await act(() => router.navigate({ to: '/views', search: {} }))
  fireEvent.click(await screen.findByRole('button', { name: 'Create team home' }))
  await screen.findByLabelText('Standings & season stats')
  fireEvent.click(await screen.findByRole('button', { name: 'Prepare next match' }))
  await screen.findByRole('heading', { name: 'Head-to-head' })
  await screen.findByRole('heading', { name: 'Team squad' })
  fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
  await waitFor(() => expect(router.state.location.search.view).toBeTruthy())
  expect((await db.savedViews.get(router.state.location.search.view!))?.spec.blocks).toHaveLength(7)
  expect(window.halfspace.views.generate).not.toHaveBeenCalled()
})

it('shows fixture refresh failure and retries into a confirmed empty report', async () => {
  await db.savedViews.update('preparation', {
    spec: { ...spec, blocks: [spec.blocks[0], spec.blocks[3]] }
  })
  await db.fixtures.update(10, { detailStaleAt: undefined, raw: fixture() })
  connection.online = true
  const refreshFixture = vi
    .fn()
    .mockResolvedValueOnce({ ok: false, error: { message: 'Weather request failed' } })
    .mockResolvedValue({
      ok: true,
      data: { fetchedAt: Date.now() + 1, fixture: { ...fixture(), weatherreport: null } }
    })
  window.halfspace.sportmonks = { refreshFixture } as unknown as typeof window.halfspace.sportmonks
  open()
  await screen.findByText('Weather request failed')
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await screen.findByText('No weather report available for this match.')
  await waitFor(async () => expect((await db.fixtures.get(10))?.raw.weatherreport).toBeNull())
  expect(refreshFixture).toHaveBeenCalledTimes(2)
})
