// @vitest-environment jsdom
import { selectOption } from '../../../test/select-option'
import { viewBlockTypes } from '@/features/views/view-editing'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import type { SportmonksFixture } from '@shared/contracts'
import type { ViewSpec } from '@shared/views'
import { routeTree } from '@/routeTree.gen'
import { mockViewsApi } from '../../../test/view-api'
import {
  clearSportmonksCache,
  db,
  writeCompetitionRefresh,
  writeCompetitionSeasonsRefresh,
  writeCompetitionFixtureRefresh,
  writeFixtureDetailRefresh,
  writeFixtureOddsRefresh,
  writeFixturePredictionsRefresh,
  writeSubscriptionRefresh
} from '@/data/db'
import { saveView } from '@/features/views/saved-views'
import { createStarterView } from '@/features/views/starter-views'
import { shortlistWindow } from '@/features/views/market-shortlist-data'
import { currentTimeZone, todayInTimeZone } from '@/lib/date'

vi.mock('@/components/app-shell', async () => ({
  AppShell: (await import('@tanstack/react-router')).Outlet
}))
vi.mock('@/features/credentials/connection-state-provider', () => ({
  ConnectionStateProvider: ({ children }: { children: React.ReactNode }) => children
}))
const connection = vi.hoisted(() => ({ online: false }))
vi.mock('@/lib/use-online', () => ({ useOnline: () => connection.online }))
const context = {
  competitionId: 8,
  competitionName: 'Premier League',
  seasonId: 12,
  seasonName: '2026/27',
  isCurrent: true
}
const timeZone = currentTimeZone(),
  today = todayInTimeZone(timeZone)
const input = { competitionId: 8, timeZone, ...shortlistWindow(today, 'next-seven-days') }
const spec: ViewSpec = {
  ...createStarterView('research', context),
  title: 'My research',
  blocks: [
    {
      id: 'shortlist',
      type: 'market-shortlist',
      span: 3,
      competitionId: 8,
      seasonId: 12,
      period: 'next-seven-days',
      outcome: 'all',
      selectedFixtureId: null
    },
    {
      id: 'probability',
      type: 'probability-context',
      span: 1,
      fixtureSourceBlockId: 'shortlist',
      market: 'match-result'
    },
    {
      id: 'prices',
      type: 'odds-comparison',
      span: 2,
      fixtureSourceBlockId: 'shortlist',
      marketId: null,
      bookmakerId: null
    },
    { id: 'weather', type: 'fixture-weather', span: 1, fixtureSourceBlockId: 'shortlist' }
  ]
}
function fixture(id: number): SportmonksFixture {
  return {
    id,
    league_id: 8,
    season_id: 12,
    state_id: 1,
    name: `Match ${id}`,
    starting_at_timestamp: (Date.now() + 86400000 + id * 60000) / 1000,
    placeholder: false,
    has_odds: true,
    scores: [],
    participants: [
      { id: id * 2, name: `Home ${id}`, meta: { location: 'home' } },
      { id: id * 2 + 1, name: `Away ${id}`, meta: { location: 'away' } }
    ]
  }
}
function card(title: string): HTMLElement {
  // The widget persists while its deferred, pending and loaded cards are replaced.
  return screen.getByRole('heading', { name: title }).closest('[data-widget]') as HTMLElement
}
function open(path = '/views?view=research'): ReturnType<typeof createRouter<typeof routeTree>> {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] })
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
  const season = { id: 12, league_id: 8, name: '2026/27', is_current: true }
  await writeCompetitionRefresh({
    fetchedAt,
    pageCount: 1,
    competitions: [
      { id: 8, country_id: 1, active: true, name: 'Premier League', currentseason: season }
    ]
  })
  await writeCompetitionSeasonsRefresh(8, { fetchedAt, pageCount: 1, seasons: [season] })
  await writeCompetitionFixtureRefresh(input, {
    fetchedAt,
    timeZone,
    pageCount: 1,
    fixtures: [
      fixture(10),
      fixture(11),
      { ...fixture(99), season_id: 13 },
      { ...fixture(98), league_id: 9 },
      { ...fixture(97), state_id: 5 },
      { ...fixture(96), starting_at_timestamp: (Date.now() - 3600000) / 1000 },
      { ...fixture(95), starting_at_timestamp: (Date.now() + 20 * 86400000) / 1000 }
    ]
  })
  for (const id of [10, 11]) {
    await writeFixtureDetailRefresh({
      fixture: {
        ...fixture(id),
        weatherreport:
          id === 10
            ? {
                id: 1,
                fixture_id: id,
                metric: 'celsius',
                type: 'forecast',
                temperature: { current: 0 }
              }
            : null
      },
      fetchedAt: Date.now()
    })
    await writeFixtureOddsRefresh(id, 'pre-match', {
      fetchedAt,
      odds: [
        {
          id,
          fixture_id: id,
          market_id: 1,
          bookmaker_id: 7,
          label: '1',
          value: id === 10 ? '2.10' : '1.80',
          bookmaker: { id: 7, name: 'Example bookmaker' },
          market: { id: 1, name: 'Match winner' },
          latest_bookmaker_update: '2026-09-14 08:00:00'
        }
      ]
    })
    await writeFixturePredictionsRefresh(id, {
      fixtureId: id,
      fetchedAt,
      predictions: [
        {
          id,
          fixture_id: id,
          type_id: 237,
          predictions: id === 10 ? { home: 55.5, draw: 0, away: 44.5 } : { home: 63.25 }
        },
        { id: id + 100, fixture_id: id, type_id: 235, predictions: { yes: 48.5, no: 51.5 } }
      ]
    })
  }
  await saveView('research', spec)
})
afterAll(() => db.close())

async function onlineProviders(): Promise<void> {
  connection.online = true
  await writeSubscriptionRefresh({
    fetchedAt: Date.now(),
    plans: [],
    addOns: [],
    resources: [
      { id: 123, description: 'Odds' },
      { id: 220, description: 'Predictions' }
    ],
    enrichments: [{ id: 124, name: 'Predictions' }]
  })
  const season = { id: 12, league_id: 8, name: '2026/27', is_current: true }
  window.halfspace.sportmonks = {
    refreshCompetition: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        competition: {
          id: 8,
          country_id: 1,
          active: true,
          name: 'Premier League',
          currentseason: season
        },
        fetchedAt: Date.now()
      }
    }),
    refreshCompetitionSeasons: vi.fn().mockResolvedValue({
      ok: true,
      data: { seasons: [season], fetchedAt: Date.now(), pageCount: 1 }
    })
  } as unknown as typeof window.halfspace.sportmonks
}

it('retains cached probabilities on a refresh failure and retries into an explicit empty result', async () => {
  await saveView('research', { ...spec, blocks: spec.blocks.slice(0, 2) })
  await onlineProviders()
  await db.fixturePredictionQueries.update(10, { staleAt: 0 })
  const refresh = vi
    .fn()
    .mockResolvedValueOnce({
      ok: false,
      error: { code: 'network', message: 'Prediction provider unavailable' }
    })
    .mockResolvedValueOnce({
      ok: true,
      data: { fixtureId: 10, predictions: [], fetchedAt: Date.now() + 100 }
    })
  window.halfspace.sportmonks.refreshFixturePredictions = refresh
  open()
  await screen.findByText('Prediction provider unavailable')
  expect(within(card('Probability context')).getByText('55.50%')).toBeTruthy()
  fireEvent.click(within(card('Probability context')).getByRole('button', { name: 'Retry' }))
  await within(card('Probability context')).findByText('No probabilities reported for this market.')
  await waitFor(async () =>
    expect((await db.fixturePredictionQueries.get(10))?.predictions).toEqual([])
  )
  expect(refresh).toHaveBeenCalledTimes(2)
})

it('fetches prices only for the visible page', async () => {
  await writeCompetitionFixtureRefresh(input, {
    fetchedAt: Date.now(),
    timeZone,
    pageCount: 1,
    fixtures: Array.from({ length: 8 }, (_, index) => fixture(index + 20))
  })
  await saveView('research', { ...spec, blocks: [spec.blocks[0]] })
  await onlineProviders()
  const refresh = vi.fn(async ({ fixtureId }: { fixtureId: number }) => ({
    ok: true as const,
    data: {
      fetchedAt: Date.now(),
      odds: [
        {
          id: fixtureId,
          fixture_id: fixtureId,
          market_id: 1,
          bookmaker_id: 7,
          label: '1',
          value: '2.00'
        }
      ]
    }
  }))
  window.halfspace.sportmonks.refreshFixtureOdds = refresh
  open()
  await screen.findByRole('button', { name: 'Inspect Match 20' })
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(6))
  await waitFor(async () => expect(await db.fixtureOddsQueries.count()).toBe(8))
  expect(refresh.mock.calls.map(([input]) => input.fixtureId).sort((a, b) => a - b)).toEqual([
    20, 21, 22, 23, 24, 25
  ])
  fireEvent.click(screen.getByRole('button', { name: 'Next matches' }))
  await screen.findByRole('button', { name: 'Inspect Match 27' })
  await waitFor(async () => expect(await db.fixtureOddsQueries.count()).toBe(10))
  expect(refresh).toHaveBeenCalledTimes(8)
  expect(screen.queryByRole('button', { name: 'Inspect Match 20' })).toBeNull()
})

it('keeps missing market selection explicit and distinguishes subscription access from an empty report', async () => {
  open()
  await screen.findByLabelText('Probability market')
  await selectOption(screen.getByLabelText('Probability market'), 'Both teams to score')
  await within(card('Probability context')).findByText('No probabilities reported for this market.')
  expect(screen.getByLabelText('Probability market').textContent).toContain('Both teams to score')
  await act(async () => {
    await writeSubscriptionRefresh({
      fetchedAt: Date.now(),
      plans: [],
      addOns: [],
      resources: [],
      enrichments: []
    })
  })
  await within(card('Probability context')).findByText(
    'Predictions are not included in your Sportmonks plan.'
  )
  expect(
    within(card('Probability context')).queryByText('No probabilities reported for this market.')
  ).toBeNull()
})

it('shows a scoped shortlist and sourced probabilities with genuine zero and missing outcomes', async () => {
  open()
  await screen.findByRole('button', { name: 'Inspect Match 10' })
  expect(
    within(card('Market shortlist')).getAllByRole('button', { name: /^Inspect/ })
  ).toHaveLength(2)
  await within(card('Probability context')).findByText('55.50%')
  expect(within(card('Probability context')).getByText('0.00%')).toBeTruthy()
  expect(
    within(card('Probability context')).getByText(/calibration and confidence interval/)
  ).toBeTruthy()
  await within(card('Match weather')).findByText('0°C')
  expect(screen.getByLabelText('Odds market').textContent).toContain('Auto · Match winner')
  fireEvent.click(screen.getByRole('button', { name: 'Inspect Match 11' }))
  await within(card('Probability context')).findByText('63.25%')
  expect(within(card('Probability context')).getAllByText('Not reported')).toHaveLength(2)
  await within(card('Odds comparison')).findByText('1.80')
  await within(card('Match weather')).findByText(/No weather report/)
  await act(async () => {
    await writeFixturePredictionsRefresh(10, {
      fixtureId: 10,
      fetchedAt: Date.now() + 1,
      predictions: [{ id: 10, fixture_id: 10, type_id: 237, predictions: { home: 99 } }]
    })
  })
  expect(within(card('Probability context')).queryByText('99.00%')).toBeNull()
})

it('retains explicit selection when a match leaves the window and restores it through undo and saving', async () => {
  const router = open()
  fireEvent.click(await screen.findByRole('button', { name: 'Inspect Match 11' }))
  await selectOption(screen.getByLabelText('Shortlist outcome'), 'Home win')
  await selectOption(screen.getByLabelText('Probability market'), 'Total goals · 2.5')
  await within(card('Probability context')).findByText('48.50%')
  fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
  await waitFor(async () =>
    expect((await db.savedViews.get('research'))?.spec.blocks[0]).toMatchObject({
      selectedFixtureId: 11,
      outcome: 'home'
    })
  )
  await act(async () => {
    await writeCompetitionFixtureRefresh(input, {
      fetchedAt: Date.now(),
      timeZone,
      pageCount: 1,
      fixtures: [fixture(10)]
    })
  })
  await screen.findByRole('button', { name: 'Use first available match' })
  expect(within(card('Probability context')).queryByText('48.50%')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Use first available match' }))
  await within(card('Probability context')).findByText('48.50%')
  fireEvent.click(screen.getByRole('button', { name: 'Undo change' }))
  await screen.findByRole('button', { name: 'Use first available match' })
  await act(async () => {
    await router.navigate({ to: '/views' })
    await router.navigate({ to: '/views', search: { view: 'research' } })
  })
  await screen.findByRole('button', { name: 'Use first available match' })
  expect(screen.queryByLabelText('Probability market')).toBeNull()
  expect((await db.savedViews.get('research'))?.spec.blocks[1]).toMatchObject({
    market: 'total-goals-2.5'
  })
})

it('preserves explicit selections and source links across cache clearing and duplication', async () => {
  open()
  fireEvent.click(await screen.findByRole('button', { name: 'Inspect Match 11' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
  await waitFor(async () =>
    expect((await db.savedViews.get('research'))?.spec.blocks[0]).toMatchObject({
      selectedFixtureId: 11
    })
  )
  await act(async () => {
    await clearSportmonksCache()
  })
  await screen.findAllByText('Not cached for offline use')
  expect(screen.queryByText('63.25%')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Duplicate view' }))
  await waitFor(async () => expect(await db.savedViews.count()).toBe(2))
  const copy = (await db.savedViews.toArray()).find((view) => view.id !== 'research')!
  expect(copy.spec.blocks).toEqual([
    { ...spec.blocks[0], selectedFixtureId: 11 },
    ...spec.blocks.slice(1)
  ])
})

it('adds both research widgets manually and removes their source and dependents as one undoable edit', async () => {
  await saveView('research', {
    ...spec,
    blocks: [
      { id: 'table', type: 'standings', competitionId: 8, seasonId: 12, teamId: null, span: 1 }
    ]
  })
  open()
  fireEvent.click(await screen.findByRole('button', { name: 'Edit blocks' }))
  const dialog = screen.getByRole('dialog')
  for (const type of ['market-shortlist', 'probability-context']) {
    await selectOption(
      within(dialog).getByLabelText('New block'),
      viewBlockTypes.find((item) => item.value === type)!.label
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add block' }))
  }
  expect(within(dialog).getAllByRole('listitem')).toHaveLength(3)
  await selectOption(within(dialog).getByLabelText('Width of block 3'), '3 columns')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Remove block 2' }))
  expect(within(dialog).getAllByRole('listitem')).toHaveLength(1)
  fireEvent.keyDown(dialog, { key: 'Escape' })
  fireEvent.click(screen.getByRole('button', { name: 'Undo change' }))
  await screen.findByRole('heading', { name: 'Probability context' })
  fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
  await waitFor(async () =>
    expect((await db.savedViews.get('research'))?.spec.blocks[2]).toMatchObject({
      type: 'probability-context',
      span: 3
    })
  )
})

it('creates the research starter without AI', async () => {
  open('/views')
  fireEvent.click(await screen.findByRole('button', { name: /Research matches/ }))
  await screen.findByRole('heading', { name: 'Probability context' })
  expect(screen.getByRole('heading', { name: 'Head-to-head' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Match absences' })).toBeTruthy()
  expect(window.halfspace.views.generate).not.toHaveBeenCalled()
})
