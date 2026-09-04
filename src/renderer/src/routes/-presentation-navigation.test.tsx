// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import type { SportmonksFixture, SportmonksLineup } from '@shared/contracts'
import {
  clearSportmonksCache,
  db,
  writeFixtureDetailRefresh,
  writePredictedLineupsRefresh,
  writeMatchFactsRefresh,
  writeHonoursRefresh,
  writePlayerRefresh
} from '@/data/db'
import { routeTree } from '@/routeTree.gen'
import { makeTopscorer } from '../../../test/topscorer-fixtures'
vi.mock('@/components/app-shell', async () => ({
  AppShell: (await import('@tanstack/react-router')).Outlet
}))
vi.mock('@/features/credentials/connection-state-provider', () => ({
  ConnectionStateProvider: ({ children }: { children: React.ReactNode }) => children
}))
vi.mock('@/lib/use-online', () => ({ useOnline: () => false }))
beforeEach(clearSportmonksCache)
afterAll(() => db.close())
const fixture: SportmonksFixture = {
  id: 10,
  league_id: 8,
  season_id: 12,
  state_id: 1,
  placeholder: false,
  has_odds: false,
  participants: [
    { id: 19, name: 'Home', meta: { location: 'home' } },
    { id: 9, name: 'Away', meta: { location: 'away' } }
  ],
  scores: [],
  lineups: []
}
const prediction: SportmonksLineup = {
  id: 1,
  fixture_id: 10,
  player_id: 100,
  team_id: 19,
  type_id: 111384,
  position_id: 27,
  jersey_number: 9,
  player_name: 'Predicted player'
}
function open(path: string): void {
  render(
    <RouterProvider
      router={createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [path] }) })}
    />
  )
}
it('labels predictions and replaces them when confirmed lineups arrive', async () => {
  await writeFixtureDetailRefresh({ fixture, fetchedAt: 100 })
  await writePredictedLineupsRefresh(10, { fixtureId: 10, lineups: [prediction], fetchedAt: 200 })
  open('/fixtures/10/lineups')
  await screen.findByRole('heading', { name: 'Predicted lineups' })
  expect(
    (await screen.findByRole('link', { name: /Predicted player/ })).getAttribute('href')
  ).toContain('/players/100')
  await writeFixtureDetailRefresh({
    fixture: {
      ...fixture,
      lineups: [
        { ...prediction, id: 2, player_id: 200, type_id: 11, player_name: 'Confirmed player' }
      ]
    },
    fetchedAt: 300
  })
  await screen.findByRole('link', { name: /Confirmed player/ })
  await waitFor(() =>
    expect(screen.queryByRole('heading', { name: 'Predicted lineups' })).toBeNull()
  )
  expect(screen.queryByRole('link', { name: /Predicted player/ })).toBeNull()
})
it('filters written facts without changing their statistical claims', async () => {
  await writeFixtureDetailRefresh({ fixture, fetchedAt: 100 })
  const base = {
    fixture_id: 10,
    type_id: 1,
    basis: 'team',
    scope: 'league_matches',
    category: 'streaks',
    type: null
  }
  await writeMatchFactsRefresh(10, {
    fixtureId: 10,
    fetchedAt: 200,
    facts: [
      {
        ...base,
        id: 1,
        participant: 'home',
        natural_language: 'Home are unbeaten in 87 of 100 matches.'
      },
      { ...base, id: 2, participant: 'away', natural_language: 'Away have won 3 of 5 matches.' },
      {
        ...base,
        id: 3,
        participant: 'referee',
        basis: 'global',
        category: 'referees',
        natural_language: 'A written referee fact.'
      },
      { ...base, id: 4, participant: 'referee', natural_language: null }
    ]
  })
  open('/fixtures/10/preview')
  await screen.findByText('Home are unbeaten in 87 of 100 matches.')
  fireEvent.change(screen.getByRole('combobox', { name: 'Facts participant' }), {
    target: { value: 'away' }
  })
  expect(screen.queryByText('Home are unbeaten in 87 of 100 matches.')).toBeNull()
  expect(screen.getByText('Away have won 3 of 5 matches.')).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox', { name: 'Facts participant' }), {
    target: { value: 'referee' }
  })
  expect(screen.queryByText('Away have won 3 of 5 matches.')).toBeNull()
  expect(screen.getByText('A written referee fact.')).toBeTruthy()
  expect(screen.getByText('Referee · Global · League matches')).toBeTruthy()
})
it('keeps honours placement explicit and links the reported season and club', async () => {
  await writePlayerRefresh({ player: makeTopscorer().player!, fetchedAt: 100 })
  const base = {
    participant_id: 100,
    team_id: 19,
    league_id: 8,
    season_id: 12,
    league: { id: 8, name: 'League' },
    season: { id: 12, league_id: 8, name: '2026' },
    team: { id: 19, name: 'Arsenal' }
  }
  await writeHonoursRefresh(
    { entity: 'players', entityId: 100 },
    {
      entity: 'players',
      entityId: 100,
      fetchedAt: 200,
      honours: [
        { ...base, id: 1, trophy_id: 1, trophy: { id: 1, name: 'Winner', position: 1 } },
        { ...base, id: 2, trophy_id: 2, trophy: { id: 2, name: 'Runner-up', position: 2 } }
      ]
    }
  )
  open('/players/100/career')
  await screen.findByText('Runner-up')
  fireEvent.change(screen.getByRole('combobox', { name: 'Honours result' }), {
    target: { value: '1' }
  })
  expect(screen.queryByText('Runner-up')).toBeNull()
  expect(screen.getByRole('link', { name: 'League' }).getAttribute('href')).toContain('season=12')
  expect(screen.getByRole('link', { name: 'Arsenal' }).getAttribute('href')).toContain(
    '/teams/19?competition=8&season=12'
  )
})
