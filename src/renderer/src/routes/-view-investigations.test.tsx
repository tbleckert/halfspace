// @vitest-environment jsdom
import { selectOption } from '../../../test/select-option'
import { viewBlockTypes } from '@/features/views/view-editing'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  readPlayerStatistics,
  readStatisticSeasons,
  db,
  writePlayerRefresh,
  writePlayerStatisticsRefresh,
  writeStatisticSeasonsRefresh,
  writeTeamRefresh,
  writeTeamStatisticsRefresh,
  writeTeamFixtureRefresh,
  writeNewsRefresh,
  writeFixtureOddsRefresh
} from '@/data/db'
import type { ViewSpec } from '@shared/views'
import type { SportmonksPlayer, SportmonksFixture } from '@shared/contracts'
import { routeTree } from '@/routeTree.gen'
import { mockViewsApi } from '../../../test/view-api'
import { saveView } from '@/features/views/saved-views'
import { teamViewFixtureInput } from '@/features/views/team-view-data'
import { currentTimeZone, todayInTimeZone } from '@/lib/date'
import {
  readViewResearchContext,
  viewResearchContext
} from '@/features/views/view-research-context'
import { validateViewSpec } from '@shared/views'
vi.mock('@/components/app-shell', async () => ({
  AppShell: (await import('@tanstack/react-router')).Outlet
}))
vi.mock('@/features/credentials/connection-state-provider', () => ({
  ConnectionStateProvider: ({ children }: { children: React.ReactNode }) => children
}))
const connection = vi.hoisted(() => ({ online: false }))
vi.mock('@/lib/use-online', () => ({ useOnline: () => connection.online }))
const selection = { playerId: 100, teamId: 19, competitionId: 8, seasonId: 12 }
const right = { ...selection, playerId: 101 }
const leftTeam = { teamId: 19, competitionId: 8, seasonId: 12, matchLocation: 'all' as const }
const next = { id: 'next', type: 'team-next-match' as const, teamId: 19, span: 2 as const }
const spec: ViewSpec = {
  version: 3,
  title: 'Investigation',
  message: '',
  blocks: [
    next,
    { id: 'profile', type: 'player-profile', selection, span: 1 },
    { id: 'players', type: 'player-comparison', left: selection, right, span: 2 },
    {
      id: 'teams',
      type: 'team-comparison',
      left: leftTeam,
      right: { ...leftTeam, teamId: 20 },
      span: 2
    },
    { id: 'news', type: 'team-news', teamId: 19, span: 1 },
    {
      id: 'odds',
      type: 'odds-comparison',
      fixtureSourceBlockId: 'next',
      marketId: null,
      bookmakerId: null,
      span: 3
    }
  ]
}
const match: SportmonksFixture = {
  id: 10,
  name: 'Arsenal vs Chelsea',
  league_id: 8,
  season_id: 12,
  state_id: 1,
  starting_at_timestamp: Date.now() / 1000 + 86400,
  placeholder: false,
  has_odds: true,
  scores: [],
  participants: [
    { id: 19, name: 'Arsenal', meta: { location: 'home' } },
    { id: 20, name: 'Chelsea', meta: { location: 'away' } }
  ]
}
function player(id: number): SportmonksPlayer {
  return {
    id,
    sport_id: 1,
    country_id: 1,
    nationality_id: 1,
    city_id: null,
    position_id: null,
    detailed_position_id: null,
    type_id: null,
    name: `Player ${id}`,
    display_name: `Player ${id}`,
    image_path: null,
    height: null,
    weight: null,
    date_of_birth: null,
    gender: 'male'
  }
}
function open(): ReturnType<typeof createRouter<typeof routeTree>> {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/views?view=study'] })
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
  for (const id of [19, 20]) {
    await writeTeamRefresh({
      fetchedAt,
      team: {
        id,
        name: id === 19 ? 'Arsenal' : 'Chelsea',
        country_id: 1,
        sport_id: 1,
        gender: 'male',
        founded: null,
        placeholder: false,
        venue_id: null
      }
    })
    await writeTeamStatisticsRefresh(
      { teamId: id, seasonId: 12 },
      {
        fetchedAt,
        statistics: [
          { id: 1, team_statistic_id: id, type_id: 52, value: { count: 30, home: { count: 20 } } }
        ]
      }
    )
    await writeStatisticSeasonsRefresh(
      { entity: 'teams', entityId: id },
      {
        fetchedAt,
        records: [
          {
            season: { id: 12, league_id: 8, name: '2026/27', is_current: true },
            teamId: id,
            teamName: id === 19 ? 'Arsenal' : 'Chelsea',
            competitionName: 'Premier League'
          }
        ]
      }
    )
  }
  for (const id of [100, 101]) {
    await writePlayerRefresh({ fetchedAt, player: player(id) })
    await writeStatisticSeasonsRefresh(
      { entity: 'players', entityId: id },
      {
        fetchedAt,
        records: [19, 20].map((teamId) => ({
          season: { id: 12, league_id: 8, name: '2026/27', is_current: true },
          teamId,
          teamName: teamId === 19 ? 'Arsenal' : 'Chelsea',
          competitionName: 'Premier League'
        }))
      }
    )
    await writePlayerStatisticsRefresh(
      { playerId: id, seasonId: 12 },
      {
        fetchedAt,
        statistics: [20, 19].map((teamId) => ({
          id: teamId,
          player_id: id,
          season_id: 12,
          team_id: teamId,
          has_values: true,
          position_id: null,
          jersey_number: null,
          details: [
            {
              id: 1,
              player_statistic_id: teamId,
              type_id: 119,
              value: { total: teamId === 19 ? 900 : 90 }
            },
            {
              id: 2,
              player_statistic_id: teamId,
              type_id: 52,
              value: { total: teamId === 19 ? 10 : 99 }
            }
          ]
        }))
      }
    )
  }
  const timeZone = currentTimeZone()
  await writeTeamFixtureRefresh(teamViewFixtureInput(19, todayInTimeZone(timeZone), timeZone), {
    fetchedAt,
    timeZone,
    pageCount: 1,
    fixtures: [match]
  })
  await writeNewsRefresh(
    { kind: 'fixture', fixtureId: 10 },
    {
      fetchedAt,
      hasMore: false,
      articles: [
        {
          id: 1,
          fixture_id: 10,
          league_id: 8,
          title: 'Arsenal prepare for Chelsea',
          type: 'prematch',
          lines: [{ id: 1, newsitem_id: 1, text: 'A reported preview.', type: 'text' }]
        }
      ]
    }
  )
  await writeNewsRefresh(
    { kind: 'fixture', fixtureId: 99 },
    {
      fetchedAt,
      hasMore: false,
      articles: [
        {
          id: 2,
          fixture_id: 99,
          league_id: 8,
          title: 'Unrelated match news',
          type: 'prematch',
          lines: []
        }
      ]
    }
  )
  await writeFixtureOddsRefresh(10, 'pre-match', {
    fetchedAt,
    odds: [
      {
        id: 1,
        fixture_id: 10,
        market_id: 1,
        bookmaker_id: 7,
        label: '1',
        value: '1.90',
        market: { id: 1, name: 'Match winner' },
        bookmaker: { id: 7, name: 'First bookmaker' }
      },
      {
        id: 2,
        fixture_id: 10,
        market_id: 1,
        bookmaker_id: 8,
        label: 'Home',
        value: '2.10',
        suspended: true,
        bookmaker: { id: 8, name: 'Second bookmaker' }
      },
      {
        id: 3,
        fixture_id: 10,
        market_id: 99,
        bookmaker_id: 7,
        label: 'Over',
        total: '2.5',
        value: '1.80',
        market: { id: 99, name: 'Example totals' }
      }
    ]
  })
  await saveView('study', spec)
})
afterAll(() => db.close())

it('renders five widgets from exact cached samples and supplies known selections to generation', async () => {
  const research = await readViewResearchContext()
  expect(validateViewSpec(spec, [], [{ teamId: 19, teamName: 'Arsenal' }], [], research)).toEqual(
    spec
  )
  open()
  await screen.findByRole('heading', { name: 'Player profile' })
  await screen.findByRole('link', { name: /Arsenal prepare for Chelsea/ })
  expect(screen.queryByText('Unrelated match news')).toBeNull()
  await screen.findByText('Suspended')
  expect(screen.queryByText('99')).toBeNull()
  const profile = screen
    .getByRole('heading', { name: 'Player profile' })
    .closest('[data-slot="card"]')!
  await waitFor(() => expect(within(profile as HTMLElement).getByText('900')).toBeTruthy())
  const comparison = screen
    .getByRole('heading', { name: 'Player comparison' })
    .closest('[data-slot="card"]')!
  expect(within(comparison as HTMLElement).getByLabelText('1 versus 1')).toBeTruthy()
  expect(window.halfspace.views.generate).not.toHaveBeenCalled()
})

it('edits a player club independently, saves, duplicates and undoes without changing other samples', async () => {
  const router = open()
  fireEvent.click(await screen.findByRole('button', { name: 'Edit blocks' }))

  await selectOption(
    screen.getByLabelText('Block 2 club and season'),
    'Chelsea · Premier League · 2026/27'
  )
  await selectOption(screen.getByLabelText('Width of block 2'), '3 columns')
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
  await waitFor(async () =>
    expect((await db.savedViews.get('study'))?.spec.blocks[1]).toMatchObject({
      span: 3,
      selection: { teamId: 20 }
    })
  )
  expect((await db.savedViews.get('study'))?.spec.blocks[2]).toEqual(spec.blocks[2])
  fireEvent.click(screen.getByRole('button', { name: 'Duplicate view' }))
  await waitFor(() => expect(router.state.location.search.view).not.toBe('study'))
  expect(
    (await db.savedViews.get(router.state.location.search.view!))?.spec.blocks[1]
  ).toMatchObject({ selection: { teamId: 20 }, span: 3 })
  await act(() => router.navigate({ to: '/views', search: { view: 'study' } }))
  await screen.findByLabelText('First team match location')
  await selectOption(screen.getByLabelText('First team match location'), 'Away matches')
  const comparison = screen
    .getByRole('heading', { name: 'Team comparison' })
    .closest('[data-slot="card"]')!
  await waitFor(() =>
    expect(within(comparison as HTMLElement).getByLabelText('— versus 30')).toBeTruthy()
  )
  fireEvent.click(screen.getByRole('button', { name: 'Undo change' }))
  expect(screen.getByLabelText('First team match location').textContent).toContain('All matches')
})

it('adds profile and comparison widgets with explicit season choices through the manual editor', async () => {
  await saveView('study', { ...spec, blocks: [next] })
  open()
  fireEvent.click(await screen.findByRole('button', { name: 'Edit blocks' }))
  await selectOption(
    await screen.findByLabelText('New block'),
    viewBlockTypes.find((item) => item.value === 'player-profile')!.label
  )

  await selectOption(
    screen.getByLabelText('First selection club and season'),
    'Arsenal · Premier League · 2026/27'
  )
  await waitFor(() =>
    expect((screen.getByRole('button', { name: 'Add block' }) as HTMLButtonElement).disabled).toBe(
      false
    )
  )
  fireEvent.click(screen.getByRole('button', { name: 'Add block' }))
  await selectOption(
    screen.getByLabelText('New block'),
    viewBlockTypes.find((item) => item.value === 'player-comparison')!.label
  )

  await selectOption(
    screen.getByLabelText('First selection club and season'),
    'Arsenal · Premier League · 2026/27'
  )
  await selectOption(screen.getByLabelText('Second selection player'), 'Player 101')

  await selectOption(
    screen.getByLabelText('Second selection club and season'),
    'Arsenal · Premier League · 2026/27'
  )
  fireEvent.click(screen.getByRole('button', { name: 'Add block' }))
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
  await waitFor(async () => expect((await db.savedViews.get('study'))?.spec.blocks).toHaveLength(3))
  expect((await db.savedViews.get('study'))?.spec.blocks[2]).toMatchObject({
    type: 'player-comparison',
    left: selection,
    right
  })
})

it('preserves explicit odds choices and all stored contexts when football caches are cleared', async () => {
  const router = open()

  await selectOption(await screen.findByLabelText('Odds market'), 'Example totals')
  await selectOption(screen.getByLabelText('Odds bookmaker'), 'Bookmaker 7')
  fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
  await waitFor(async () =>
    expect((await db.savedViews.get('study'))?.spec.blocks[5]).toMatchObject({
      marketId: 99,
      bookmakerId: 7
    })
  )
  const saved = (await db.savedViews.get('study'))!.spec
  await act(() => router.navigate({ to: '/views', search: {} }))
  await act(() => clearSportmonksCache())
  expect(
    validateViewSpec(
      saved,
      [],
      [{ teamId: 19, teamName: 'Arsenal' }],
      [],
      viewResearchContext(await readViewResearchContext(), saved.blocks)
    )
  ).toEqual(saved)
  await act(() => router.navigate({ to: '/views', search: { view: 'study' } }))
  expect((await db.savedViews.get('study'))?.spec).toEqual(saved)
  await screen.findAllByText('Statistics not cached for offline use.')
})

it('creates a player-study starter with the same validated selections and no AI', async () => {
  const router = open()
  await act(() => router.navigate({ to: '/views', search: {} }))
  fireEvent.click(await screen.findByRole('button', { name: 'Create a player study' }))
  const first = await screen.findByLabelText('First sample club and season')

  await selectOption(first, 'Arsenal · Premier League · 2026/27')
  await selectOption(screen.getByLabelText('Second sample player'), 'Player 101')
  const second = screen.getByLabelText('Second sample club and season')

  await selectOption(second, 'Chelsea · Premier League · 2026/27')
  fireEvent.click(screen.getByRole('button', { name: 'Create player study' }))
  await screen.findByRole('heading', { name: 'Player comparison' })
  fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
  await waitFor(() => expect(router.state.location.search.view).toBeTruthy())
  const saved = (await db.savedViews.get(router.state.location.search.view!))!.spec
  expect(saved.blocks.map(({ type, span }) => ({ type, span }))).toEqual([
    { type: 'player-profile', span: 1 },
    { type: 'player-profile', span: 2 },
    { type: 'player-comparison', span: 3 }
  ])
  expect(saved.blocks[2]).toMatchObject({ left: selection, right: { ...right, teamId: 20 } })
  expect(window.halfspace.views.generate).not.toHaveBeenCalled()
})

it('restores comparison identities and exact season labels after clearing the football cache', async () => {
  const samples = await Promise.all(
    [100, 101].map(async (playerId) => ({
      playerId,
      statistics: (await readPlayerStatistics({ playerId, seasonId: 12 }))!,
      seasons: (await readStatisticSeasons({ entity: 'players', entityId: playerId }))!
    }))
  )
  await db.savedViews.update('study', { spec: { ...spec, blocks: [spec.blocks[2]] } })
  await clearSportmonksCache()
  connection.online = true
  window.halfspace.sportmonks = {
    refreshPlayer: vi.fn(async ({ playerId }: { playerId: number }) => ({
      ok: true,
      data: {
        player: {
          ...player(playerId),
          display_name: playerId === 100 ? 'Bukayo Saka' : 'Cole Palmer'
        },
        fetchedAt: Date.now()
      }
    })),
    refreshPlayerStatistics: vi.fn(async ({ playerId }: { playerId: number }) => ({
      ok: true,
      data: samples.find((sample) => sample.playerId === playerId)!.statistics
    })),
    refreshStatisticSeasons: vi.fn(async ({ entityId }: { entityId: number }) => ({
      ok: true,
      data: samples.find((sample) => sample.playerId === entityId)!.seasons
    }))
  } as unknown as typeof window.halfspace.sportmonks
  open()
  await screen.findByRole('heading', { name: 'Bukayo Saka' })
  await screen.findByRole('heading', { name: 'Cole Palmer' })
  await screen.findAllByText('Arsenal · Premier League · 2026/27')
  await screen.findAllByText('900')
  await waitFor(async () => {
    expect((await readPlayerStatistics({ playerId: 100, seasonId: 12 }))?.statistics).toEqual(
      samples[0].statistics.statistics
    )
    expect((await readPlayerStatistics({ playerId: 101, seasonId: 12 }))?.statistics).toEqual(
      samples[1].statistics.statistics
    )
    expect((await readStatisticSeasons({ entity: 'players', entityId: 101 }))?.records).toEqual(
      samples[1].seasons.records
    )
  })
})
