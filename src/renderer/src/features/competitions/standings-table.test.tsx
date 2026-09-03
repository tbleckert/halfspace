// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider
} from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import type { CachedStanding } from '@/data/db'
import { StandingsTable } from './standings-table'

const standing: CachedStanding = {
  id: 1,
  participantId: 37,
  leagueId: 384,
  seasonId: 27895,
  stageId: 1,
  groupId: null,
  position: 1,
  fetchedAt: 1_000,
  raw: {
    id: 1,
    participant_id: 37,
    league_id: 384,
    season_id: 27895,
    stage_id: 1,
    group_id: null,
    round_id: null,
    standing_rule_id: null,
    position: 1,
    result: 'equal',
    points: 6,
    participant: { id: 37, name: 'Roma' },
    details: [
      { id: 1, type_id: 129, value: 2 },
      { id: 2, type_id: 179, value: 5 }
    ],
    form: [{ id: 1, fixture_id: 50, form: 'W', sort_order: 1 }]
  }
}

function renderTable(row: CachedStanding): void {
  const rootRoute = createRootRoute({
    component: () => (
      <StandingsTable
        competitionId={384}
        date="2026-09-03"
        name="Table"
        online={false}
        season={27895}
        standings={[row]}
      />
    )
  })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] })
  })
  render(<RouterProvider router={router} />)
}

describe('standings table', () => {
  it('shows provider totals and links form to matches with season context', async () => {
    renderTable(standing)
    const table = await screen.findByRole('table', { name: 'Table' })
    expect(within(table).getByRole('cell', { name: '2' })).not.toBeNull()
    expect(within(table).getByRole('cell', { name: '+5' })).not.toBeNull()
    const link = within(table).getByRole('link', { name: 'Roma: Win, open match' })
    expect(link.getAttribute('href')).toBe(
      '/fixtures/50?competition=384&date=2026-09-03&season=27895'
    )
  })

  it('leaves unreported totals unknown and does not invent form', async () => {
    renderTable({ ...standing, raw: { ...standing.raw, details: undefined, form: undefined } })
    const table = await screen.findByRole('table', { name: 'Table' })
    expect(within(table).getAllByRole('cell', { name: '–' })).toHaveLength(2)
    expect(within(table).queryByRole('link', { name: /open match/ })).toBeNull()
  })
})
