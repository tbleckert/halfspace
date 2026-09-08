// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider
} from '@tanstack/react-router'
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { SportmonksFixture, SportmonksLineup } from '@shared/contracts'
import {
  clearSportmonksCache,
  db,
  writeSubscriptionRefresh,
  writeFixturePredictionsRefresh,
  writeFixtureExpectedMetricsRefresh,
  writeFixturePeriodStatisticsRefresh,
  writeExpectedLineupsRefresh
} from '@/data/db'
import { FixturePredictions } from './fixture-predictions'
import { FixtureStats } from './fixture-stats'
import { FixtureLineupView } from './fixture-lineup-view'

const context = { competition: 2, season: 1, date: '2026-09-08' }
const fixture: SportmonksFixture = {
  id: 10,
  league_id: 2,
  season_id: 1,
  state_id: 1,
  placeholder: false,
  has_odds: false,
  participants: [
    { id: 19, name: 'Home club', meta: { location: 'home' } },
    { id: 8, name: 'Away club', meta: { location: 'away' } }
  ],
  scores: [],
  statistics: [
    {
      id: 1,
      fixture_id: 10,
      type_id: 45,
      participant_id: 19,
      location: 'home',
      data: { value: 60 },
      type: { id: 45, name: 'Possession' }
    }
  ]
}
const lineup: SportmonksLineup = {
  id: 1,
  fixture_id: 10,
  player_id: 20,
  team_id: 19,
  position_id: 27,
  type_id: 77614,
  player_name: 'Expected starter',
  jersey_number: 9
}

beforeEach(async () => {
  await clearSportmonksCache()
  await writeSubscriptionRefresh({
    fetchedAt: Date.now(),
    plans: [],
    addOns: [],
    resources: [
      { id: 142, description: 'Fixture' },
      { id: 220, description: 'Predictions' }
    ],
    enrichments: [
      { id: 143, name: 'Expected metrics' },
      { id: 155, name: 'Expected lineups' },
      { id: 124, name: 'Predictions' }
    ]
  })
})
afterEach(cleanup)
afterAll(() => db.close())

it('shows cached prediction percentages offline including every correct-score outcome', async () => {
  await writeFixturePredictionsRefresh(10, {
    fixtureId: 10,
    fetchedAt: Date.now(),
    predictions: [
      {
        id: 1,
        fixture_id: 10,
        type_id: 237,
        predictions: { home: 57.82, away: 21.03, draw: 21.15 }
      },
      {
        id: 2,
        fixture_id: 10,
        type_id: 240,
        predictions: {
          scores: {
            '1-0': 10,
            '2-0': 9,
            '3-0': 8,
            '0-0': 7,
            '1-1': 6,
            '2-1': 5,
            Other_1: 4,
            Other_2: 3,
            Other_X: 2
          }
        }
      }
    ]
  })
  render(<FixturePredictions fixture={fixture} online={false} />)
  expect(await screen.findByText('57.82%')).toBeTruthy()
  fireEvent.click(screen.getByText('More score outcomes'))
  expect(screen.getByText('Other draw')).toBeTruthy()
})

it('uses only the selected period and leaves full-match xG out of half statistics', async () => {
  await writeFixtureExpectedMetricsRefresh(10, {
    fixtureId: 10,
    fetchedAt: Date.now(),
    statistics: [
      {
        id: 2,
        fixture_id: 10,
        type_id: 5304,
        participant_id: 19,
        location: 'home',
        data: { value: 2.7533 }
      }
    ]
  })
  await writeFixturePeriodStatisticsRefresh(10, {
    fixtureId: 10,
    fetchedAt: Date.now(),
    periods: [
      {
        id: 20,
        fixture_id: 10,
        type_id: 1,
        description: 'First half',
        sort_order: 1,
        statistics: [{ ...fixture.statistics![0], period_id: 20, data: { value: 40 } }]
      }
    ]
  })
  const select = vi.fn()
  const { rerender } = render(
    <FixtureStats fixture={fixture} context={context} online={false} onSelectPeriod={select} />
  )
  expect(await screen.findByText('2.75')).toBeTruthy()
  const picker = screen.getByLabelText('Statistics period')
  await screen.findByRole('option', { name: 'First half' })
  fireEvent.change(picker, { target: { value: '20' } })
  expect(select).toHaveBeenCalledWith(20)
  rerender(
    <FixtureStats
      fixture={fixture}
      context={context}
      online={false}
      periodId={20}
      onSelectPeriod={select}
    />
  )
  expect(await screen.findByText('40')).toBeTruthy()
  expect(screen.queryByText('60')).toBeNull()
  expect(screen.queryByText('2.75')).toBeNull()
  rerender(
    <FixtureStats
      fixture={fixture}
      context={context}
      online={false}
      periodId={99}
      onSelectPeriod={select}
    />
  )
  expect(await screen.findByText('No statistics reported for this period')).toBeTruthy()
  expect(screen.queryByText('60')).toBeNull()
})

it('keeps the expected XI and expected bench distinct and lets confirmed sheets take precedence', async () => {
  await writeExpectedLineupsRefresh(10, {
    fixtureId: 10,
    fetchedAt: Date.now(),
    lineups: [
      lineup,
      { ...lineup, id: 2, player_id: 21, type_id: 77615, player_name: 'Expected substitute' }
    ]
  })
  const root = createRootRoute({
    component: () => (
      <FixtureLineupView
        fixture={fixture}
        context={context}
        online={false}
        onSelectSource={vi.fn()}
      />
    )
  })
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ['/'] })
  })
  const { unmount } = render(<RouterProvider router={router} />)
  expect(await screen.findByText('Expected starter')).toBeTruthy()
  expect(screen.getByText('Expected bench')).toBeTruthy()
  expect(screen.getByText('Expected substitute')).toBeTruthy()
  const playerLink = screen.getByText('Expected starter').closest('a')
  expect(playerLink?.getAttribute('href')).toContain('/players/20')
  expect(playerLink?.getAttribute('href')).toContain('season=1')
  unmount()
  const confirmedRoot = createRootRoute({
    component: () => (
      <FixtureLineupView
        fixture={{
          ...fixture,
          lineups: [{ ...lineup, type_id: 11, player_name: 'Confirmed starter' }]
        }}
        context={context}
        online={false}
        onSelectSource={vi.fn()}
      />
    )
  })
  const confirmedRouter = createRouter({
    routeTree: confirmedRoot,
    history: createMemoryHistory({ initialEntries: ['/'] })
  })
  render(<RouterProvider router={confirmedRouter} />)
  expect(await screen.findByText('Confirmed starter')).toBeTruthy()
  expect(screen.queryByText('Expected starter')).toBeNull()
  expect(screen.queryByLabelText('Lineup forecast')).toBeNull()
})
