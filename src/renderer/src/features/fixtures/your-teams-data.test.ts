import { describe, expect, it } from 'vitest'
import type { CachedFixture } from '@/data/db'
import { selectYourTeamFixtures } from './your-teams-data'

const today = '2026-09-08'
const match = (
  id: number,
  state: number,
  date: string,
  overrides: Partial<CachedFixture> = {}
): CachedFixture =>
  fixture(id, state, { startingAt: Date.parse(date + 'T18:00:00Z'), ...overrides })
const select = (
  fixtures: CachedFixture[],
  teamId = 11
): ReturnType<typeof selectYourTeamFixtures> =>
  selectYourTeamFixtures(fixtures, teamId, today, 'UTC')

describe('My teams fixture selection', () => {
  it('selects the closest scheduled match and completed result across the full month window', () => {
    const upcoming = match(1, 1, '2026-09-25')
    const previous = match(2, 5, '2026-08-20')
    const result = select([
      match(3, 1, '2026-10-01'),
      previous,
      match(4, 8, '2026-08-15'),
      upcoming
    ])
    expect(result.upcoming?.fixture).toBe(upcoming)
    expect(result.previous?.fixture).toBe(previous)
  })
  it('includes the 30-day boundaries and excludes fixtures beyond them', () => {
    expect(select([match(1, 1, '2026-10-09'), match(2, 5, '2026-08-08')])).toEqual({
      upcoming: undefined,
      previous: undefined
    })
    expect(
      select([match(1, 1, '2026-10-08'), match(2, 5, '2026-08-09')]).upcoming?.fixture.id
    ).toBe(1)
    expect(
      select([match(1, 1, '2026-10-08'), match(2, 5, '2026-08-09')]).previous?.fixture.id
    ).toBe(2)
  })
  it('excludes other teams, placeholders, undated fixtures and non-qualifying states', () => {
    const fixtures = [
      match(1, 1, today, { homeTeamId: 33, awayTeamId: 44 }),
      match(2, 1, today, { placeholder: true }),
      fixture(3, 1, { startingAt: null }),
      ...[2, 3, 6, 9, 10, 11, 22].map((state) => match(state + 10, state, today)),
      match(50, 1, '2026-09-07'),
      match(51, 5, '2026-09-09')
    ]
    expect(select(fixtures)).toEqual({ upcoming: undefined, previous: undefined })
  })
  it('allows a shared fixture in each participating team card', () => {
    const shared = match(1, 1, today)
    expect(select([shared], 11).upcoming?.fixture).toBe(shared)
    expect(select([shared], 22).upcoming?.fixture).toBe(shared)
  })
  it('uses local dates across midnight and sorts kickoffs without mutating input', () => {
    const later = match(2, 1, today, { startingAt: Date.parse('2026-09-08T20:00:00Z') })
    const earlier = match(1, 1, today, { startingAt: Date.parse('2026-09-07T23:00:00Z') })
    const fixtures = [later, earlier]
    expect(selectYourTeamFixtures(fixtures, 11, today, 'Europe/Stockholm').upcoming).toEqual({
      date: today,
      fixture: earlier
    })
    expect(fixtures).toEqual([later, earlier])
  })
  it.each([5, 7, 8])('accepts completed state %s', (state) => {
    expect(select([match(1, state, today)]).previous?.fixture.id).toBe(1)
  })
})

function fixture(
  id: number,
  stateId: number,
  overrides: Partial<CachedFixture> = {}
): CachedFixture {
  return {
    id,
    leagueId: 8,
    seasonId: 23614,
    stateId,
    startingAt: Date.UTC(2026, 8, 8, 18),
    name: `Fixture ${id}`,
    resultInfo: null,
    placeholder: false,
    hasOdds: false,
    homeTeamId: 11,
    awayTeamId: 22,
    raw: {
      id,
      league_id: 8,
      season_id: 23614,
      state_id: stateId,
      placeholder: false,
      has_odds: false,
      participants: [],
      scores: []
    },
    fetchedAt: 0,
    staleAt: 0,
    ...overrides
  }
}
