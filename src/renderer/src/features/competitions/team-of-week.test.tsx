// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider
} from '@tanstack/react-router'
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  writeSeasonScheduleRefresh,
  writeTeamOfWeekRefresh
} from '@/data/db'
import type { SportmonksFixture } from '@shared/contracts'
import { makeTopscorer } from '../../../../test/topscorer-fixtures'
import { TeamOfWeek } from './team-of-week'

beforeEach(() => clearSportmonksCache())
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
afterAll(() => db.close())

it.each(['matching', 'missing', 'other season', 'other competition'] as const)(
  'uses only matching cached match context and keeps links available when the fixture is %s',
  async (scenario) => {
    const fixture: SportmonksFixture = {
      id: 10,
      league_id: scenario === 'other competition' ? 99 : 2,
      season_id: scenario === 'other season' ? 99 : 1,
      state_id: 5,
      placeholder: false,
      has_odds: false,
      starting_at: '2026-09-11 18:00:00',
      starting_at_timestamp: Date.parse('2026-09-11T18:00:00Z') / 1000,
      participants: [
        { id: 19, name: 'Home club', meta: { location: 'home' } },
        { id: 8, name: 'Away club', meta: { location: 'away' } }
      ],
      scores: [
        {
          id: 1,
          participant_id: 19,
          description: 'CURRENT',
          score: { goals: 3, participant: 'home' }
        },
        {
          id: 2,
          participant_id: 8,
          description: 'CURRENT',
          score: { goals: 0, participant: 'away' }
        }
      ]
    }
    await writeSeasonScheduleRefresh(1, {
      fetchedAt: Date.now(),
      stages: [
        {
          id: 4,
          season_id: 1,
          sort_order: 1,
          name: 'League',
          finished: false,
          is_current: true,
          fixtures: [],
          rounds: [
            {
              id: 3,
              name: '1',
              finished: true,
              is_current: true,
              fixtures: scenario === 'missing' ? [] : [fixture]
            }
          ]
        }
      ]
    })
    await writeTeamOfWeekRefresh(
      { competitionId: 2, roundId: 3 },
      {
        fetchedAt: Date.now(),
        entries: [
          {
            id: 1,
            player_id: 100,
            team_id: 19,
            fixture_id: 10,
            round_id: 3,
            rating: 8.75,
            formation_position: 1,
            formation: '4-3-3',
            player: makeTopscorer().player!,
            team: { ...makeTopscorer().participant!, id: 19, name: 'Home club' },
            round: { id: 3, league_id: 2, season_id: 1, name: '1' }
          }
        ]
      }
    )
    const requests = { refreshSeasonSchedule: vi.fn(), refreshTeamOfWeek: vi.fn() }
    vi.stubGlobal('halfspace', { sportmonks: requests })
    const root = createRootRoute({
      component: () => (
        <TeamOfWeek
          competitionId={2}
          seasonId={1}
          currentSeason={false}
          roundId={3}
          date="2026-09-11"
          online={false}
          onRoundChange={() => {}}
        />
      )
    })
    const router = createRouter({ routeTree: root, history: createMemoryHistory() })
    render(<RouterProvider router={router} />)
    await screen.findByText('8.75')
    const match =
      scenario === 'matching'
        ? await screen.findByRole('link', { name: /Home club.*Away club/ })
        : await screen.findByRole('link', { name: 'View match' })
    expect(match.getAttribute('href')).toContain('/fixtures/10')
    expect(match.getAttribute('href')).toContain('season=1')
    if (scenario === 'matching') {
      expect(within(match).getByText('3')).toBeTruthy()
      expect(within(match).getByText('0')).toBeTruthy()
      expect(match.querySelector('time')?.textContent).toBeTruthy()
    } else {
      expect(screen.queryByText('Away club')).toBeNull()
    }
    expect(requests.refreshSeasonSchedule).not.toHaveBeenCalled()
    expect(requests.refreshTeamOfWeek).not.toHaveBeenCalled()
  }
)
