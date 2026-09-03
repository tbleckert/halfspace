import { describe, expect, it } from 'vitest'
import { refereeStatisticsSummary } from '@/features/statistics/statistics-data'
import { refereeSeasonOptions } from './referee-statistics-data'

describe('referee season statistics', () => {
  it('uses reported counts and averages and keeps dismissals separate', () => {
    const summary = refereeStatisticsSummary([
      { type_id: 188, value: { count: 4 } },
      { type_id: 84, value: { all: { count: 10, average: 2.5 } } },
      { type_id: 83, value: { all: { count: 0, average: 0 } } },
      { type_id: 85, value: { all: { count: 1, average: 0.25 } } },
      { type_id: 56, value: { count: 83, average: 20.75 } }
    ])
    expect(summary.matches).toBe(4)
    expect(summary.rows).toContainEqual({ label: 'Yellow cards', total: 10, average: 2.5 })
    expect(summary.rows).toContainEqual({ label: 'Straight red cards', total: 0, average: 0 })
    expect(summary.rows).toContainEqual({ label: 'Second yellow cards', total: 1, average: 0.25 })
    expect(summary.rows).toContainEqual({ label: 'Penalties', total: null, average: null })
    expect(refereeStatisticsSummary([]).matches).toBeNull()
  })

  it('offers ten recent seasons per competition, with competition names for disambiguation', () => {
    const statistics = Array.from({ length: 12 }, (_, index) => ({
      id: index,
      referee_id: 1,
      season_id: index + 1,
      details: [],
      season: {
        id: index + 1,
        league_id: 8,
        name: String(2015 + index),
        starting_at: `${2015 + index}-08-01`,
        is_current: index === 11,
        league: { id: 8, name: 'Premier League' }
      }
    }))
    const options = refereeSeasonOptions([
      ...statistics,
      {
        ...statistics[11],
        id: 20,
        season_id: 20,
        season: {
          ...statistics[11].season,
          id: 20,
          league_id: 384,
          league: { id: 384, name: 'Serie A' }
        }
      }
    ])
    expect(options).toHaveLength(11)
    expect(options[0].name).toContain('2026')
    expect(options.some(({ id }) => id === 1)).toBe(false)
    expect(options.find(({ id }) => id === 20)?.name).toBe('2026 · Serie A')
  })
})
