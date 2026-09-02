import { describe, expect, it } from 'vitest'
import type { CachedFixture } from '@/data/db'
import { buildMatchdaySections, matchdayWindow } from './matchday-hub'

describe('matchday hub', () => {
  it('builds a Monday-to-Sunday week inside a wider rolling window', () => {
    expect(matchdayWindow('2026-09-02')).toEqual({
      startDate: '2026-08-30',
      endDate: '2026-09-09',
      dates: [
        '2026-08-30',
        '2026-08-31',
        '2026-09-01',
        '2026-09-02',
        '2026-09-03',
        '2026-09-04',
        '2026-09-05',
        '2026-09-06',
        '2026-09-07',
        '2026-09-08',
        '2026-09-09'
      ],
      navigationDates: [
        '2026-08-31',
        '2026-09-01',
        '2026-09-02',
        '2026-09-03',
        '2026-09-04',
        '2026-09-05',
        '2026-09-06'
      ]
    })
  })

  it('includes the whole calendar week in the rolling window', () => {
    const window = matchdayWindow('2026-09-06')

    expect(window.startDate).toBe('2026-08-31')
    expect(window.endDate).toBe('2026-09-13')
    expect(window.navigationDates).toEqual([
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      '2026-09-06'
    ])
  })

  it('separates live matches, the next three fixture days, and recent completed results', () => {
    const sections = buildMatchdaySections(
      [
        day('2026-08-30', fixture(1, 1)),
        day('2026-08-31', fixture(2, 5)),
        day('2026-09-01', fixture(3, 5), fixture(4, 1)),
        day('2026-09-02', fixture(5, 2), fixture(6, 1)),
        day('2026-09-03', fixture(7, 1)),
        day('2026-09-04'),
        day('2026-09-05', fixture(8, 1)),
        day('2026-09-06', fixture(9, 1)),
        day('2026-09-07', fixture(10, 1))
      ],
      '2026-09-02',
      '2026-09-02'
    )

    expect(sections.live.map(({ id }) => id)).toEqual([5])
    expect(sections.selected.map(({ id }) => id)).toEqual([6])
    expect(sections.following.map(({ date }) => date)).toEqual([
      '2026-09-03',
      '2026-09-05',
      '2026-09-06'
    ])
    expect(sections.earlier).toEqual([
      { date: '2026-09-01', fixtures: [expect.objectContaining({ id: 3 })] },
      { date: '2026-08-31', fixtures: [expect.objectContaining({ id: 2 })] }
    ])
  })

  it('keeps surrounding fixtures chronological when browsing another date', () => {
    const sections = buildMatchdaySections(
      [
        day('2026-08-31', fixture(1, 1)),
        day('2026-09-01', fixture(2, 1)),
        day('2026-09-02'),
        day('2026-09-03', fixture(3, 1))
      ],
      '2026-09-02',
      '2026-09-10'
    )

    expect(sections.live).toEqual([])
    expect(sections.following.map(({ date }) => date)).toEqual(['2026-09-03'])
    expect(sections.earlier.map(({ date }) => date)).toEqual(['2026-09-01', '2026-08-31'])
  })
})

function day(
  date: string,
  ...fixtures: CachedFixture[]
): {
  date: string
  fixtures: CachedFixture[]
} {
  return { date, fixtures }
}

function fixture(id: number, stateId: number): CachedFixture {
  return {
    id,
    leagueId: 8,
    seasonId: 23614,
    stateId,
    startingAt: Date.UTC(2026, 8, 2, 18),
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
    staleAt: 0
  }
}
