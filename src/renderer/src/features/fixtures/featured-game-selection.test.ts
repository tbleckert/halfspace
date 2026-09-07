import { describe, expect, it } from 'vitest'
import type { CachedFixture } from '@/data/db'
import {
  scoreFeaturedGame,
  selectFeaturedGame,
  sameCityMatch,
  type FeaturedCandidate,
  type FeaturedSignals
} from './featured-game-selection'

const now = Date.UTC(2026, 8, 7, 12)
function fixture(id: number, stateId = 1): CachedFixture {
  return {
    id,
    stateId,
    startingAt: now + 3600000,
    placeholder: false,
    homeTeamId: id * 2,
    awayTeamId: id * 2 + 1,
    leagueId: 999,
    raw: { id, state_id: stateId, participants: [], scores: [] }
  } as unknown as CachedFixture
}
function candidates(count: number, signals: FeaturedSignals = {}): FeaturedCandidate[] {
  return Array.from({ length: count }, (_, i) => ({
    fixture: fixture(i + 1),
    signals: i === 0 ? signals : {}
  }))
}

describe('featured game', () => {
  it('requires all three known city IDs to agree', () => {
    expect(sameCityMatch(10, 10, 10)).toBe(true)
    expect(sameCityMatch(10, 10, 20)).toBe(false)
    expect(sameCityMatch(10, 20, 10)).toBe(false)
    expect(sameCityMatch(null, null, null)).toBe(false)
  })
  it('only awards current-table points after halfway, keeping last season independent', () => {
    const f = fixture(1)
    expect(scoreFeaturedGame(f, { currentTopFour: true, previousTopFour: true }, now).points).toBe(
      25
    )
    expect(
      scoreFeaturedGame(f, { currentTopFour: true, halfway: true, previousTopFour: true }, now)
        .points
    ).toBe(45)
  })
  it('adds rivalry and city bonuses independently and increases knockout weight by stage', () => {
    const f = fixture(1)
    expect(
      scoreFeaturedGame(f, { rivalry: true, sameCity: true, knockout: 'quarter-final' }, now).points
    ).toBe(55)
    expect(scoreFeaturedGame(f, { knockout: 'semi-final' }, now).points).toBe(25)
    expect(scoreFeaturedGame(f, { knockout: 'final' }, now).points).toBe(30)
  })
  it('weights team pins above competition pins without double-counting both teams', () => {
    expect(
      scoreFeaturedGame(fixture(1), { pinnedTeams: 2, pinnedCompetition: true }, now).points
    ).toBe(60)
  })
  it('hides under five, requires 45 for five through ten, and always picks above ten', () => {
    expect(
      selectFeaturedGame(candidates(4, { rivalry: true, previousTopFour: true }), now)
    ).toBeNull()
    expect(selectFeaturedGame(candidates(5), now)).toBeNull()
    expect(selectFeaturedGame(candidates(10), now)).toBeNull()
    expect(
      selectFeaturedGame(candidates(5, { rivalry: true, sameCity: true }), now)?.fixture.id
    ).toBe(1)
    expect(selectFeaturedGame(candidates(11), now)?.fixture.id).toBe(1)
  })
  it('keeps the previous unfinished choice, then rotates to another eligible game', () => {
    const games = candidates(11, { rivalry: true })
    games[1].fixture = fixture(2, 2)
    expect(selectFeaturedGame(games, now, 2)?.fixture.id).toBe(2)
    games[1].fixture = fixture(2, 5)
    expect(selectFeaturedGame(games, now, 2)?.fixture.id).toBe(1)
  })
  it('keeps the day count when early games finish and retains the last result at day end', () => {
    const games = candidates(11).map((entry) => ({
      ...entry,
      fixture: fixture(entry.fixture.id, 5)
    }))
    games[10].fixture = fixture(11)
    expect(selectFeaturedGame(games, now, 1)?.fixture.id).toBe(11)
    games[10].fixture = fixture(11, 5)
    expect(selectFeaturedGame(games, now, 11)?.fixture.id).toBe(11)
  })
  it('never features postponed, cancelled, or placeholder fixtures', () => {
    const games = candidates(14)
    games[0].fixture = fixture(1, 4)
    games[1].fixture = fixture(2, 11)
    games[2].fixture.placeholder = true
    expect(selectFeaturedGame(games, now)?.fixture.id).toBe(4)
  })
  it('does not promote a finished worthy game ahead of remaining unworthy fixtures on a quiet day', () => {
    const games = candidates(5, { rivalry: true, previousTopFour: true })
    games[0].fixture = fixture(1, 5)
    expect(selectFeaturedGame(games, now, 1)).toBeNull()
  })
})
