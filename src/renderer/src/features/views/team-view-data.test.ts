import { expect, it } from 'vitest'
import { toCachedFixtures } from '@/data/db'
import type { SportmonksFixture } from '@shared/contracts'
import { selectTeamViewFixtures } from './team-view-data'

const now = Date.UTC(2026, 8, 13)
function match(id: number, days: number, state: number, team = 19): SportmonksFixture {
  return {
    id,
    league_id: 8,
    season_id: 12,
    state_id: state,
    starting_at_timestamp: (now + days * 86400000) / 1000,
    placeholder: false,
    has_odds: false,
    scores: [],
    participants: [{ id: team, name: 'Team', meta: { location: 'home' } }]
  }
}

it('selects only this team’s scheduled future matches, in kickoff order', async () => {
  const fixtures = await toCachedFixtures(
    [
      match(1, 4, 1),
      match(2, 2, 1),
      match(3, -1, 1),
      match(4, 2, 1, 20),
      match(5, 1, 2),
      match(6, 2, 17),
      { ...match(7, 3, 1), placeholder: true },
      { ...match(8, 1, 1), starting_at_timestamp: null }
    ],
    now,
    now + 60000
  )
  expect(selectTeamViewFixtures(fixtures, 19, 'upcoming', now).map(({ id }) => id)).toEqual([2, 1])
  expect(fixtures[0].id).toBe(1)
})

it('includes completed extra-time and penalty results, with the latest first', async () => {
  const fixtures = await toCachedFixtures(
    [
      match(1, -5, 5),
      match(2, -3, 7),
      match(3, -1, 8),
      match(4, 1, 5),
      match(5, -1, 2),
      match(6, -1, 5, 20)
    ],
    now,
    now + 60000
  )
  expect(selectTeamViewFixtures(fixtures, 19, 'recent', now).map(({ id }) => id)).toEqual([3, 2, 1])
})
