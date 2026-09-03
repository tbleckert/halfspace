import { describe, expect, it } from 'vitest'
import type { SportmonksOdd } from '@shared/contracts'
import { oddsComparison } from './odds-comparison'

const quote: SportmonksOdd = {
  id: 1,
  fixture_id: 10,
  market_id: 1,
  bookmaker_id: 2,
  label: '1',
  name: 'Home club',
  value: '1.80',
  market_description: 'Fulltime Result',
  latest_bookmaker_update: '2026-09-03 18:30:00'
}

describe('odds comparison', () => {
  it('compares equivalent full-time result descriptions without merging score-specific contexts', () => {
    const result = oddsComparison(
      [
        quote,
        { ...quote, id: 2, bookmaker_id: 3, market_description: 'Full Time Result', value: '1.9' },
        { ...quote, id: 3, bookmaker_id: 4, market_description: 'Match Winner', value: '2.1' },
        { ...quote, id: 4, bookmaker_id: 5, market_description: 'Fulltime Result (1-0)' }
      ],
      1
    )
    expect(result.rows).toHaveLength(2)
    expect(result.rows.find((row) => row.quotes.size === 3)?.highest).toBe(2.1)
  })
  it('aligns match-result outcomes across bookmakers and highlights only the highest available quote', () => {
    const result = oddsComparison(
      [
        quote,
        { ...quote, id: 2, bookmaker_id: 3, name: 'Home', label: 'Home', value: '1.90' },
        { ...quote, id: 3, bookmaker_id: 4, value: '2.00', suspended: true }
      ],
      1
    )
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].label).toBe('Home')
    expect(result.rows[0].highest).toBe(1.9)
    expect(result.bookmakers).toHaveLength(3)
  })
  it('never combines different totals, handicaps, players, or in-play score contexts', () => {
    const base = {
      ...quote,
      market_id: 12,
      label: 'Over',
      name: null,
      total: '2.5',
      market_description: 'Goal Line (0-0)'
    }
    const result = oddsComparison(
      [
        base,
        { ...base, id: 2, total: '3.5' },
        { ...base, id: 3, handicap: '1' },
        { ...base, id: 4, name: 'Player A' },
        { ...base, id: 5, market_description: 'Goal Line (1-0)' }
      ],
      12
    )
    expect(result.rows).toHaveLength(5)
  })
  it('uses the latest quote, including a suspension that replaced an older price', () => {
    const newer = {
      ...quote,
      id: 2,
      value: '2.00',
      stopped: true,
      latest_bookmaker_update: '2026-09-03 18:31:00'
    }
    const result = oddsComparison([newer, quote], 1)
    expect(result.rows[0].quotes.get(2)).toEqual(newer)
    expect(result.rows[0].highest).toBeNull()
  })
  it('filters bookmakers without mixing prices or treating invalid values as a best price', () => {
    const result = oddsComparison(
      [quote, { ...quote, id: 2, bookmaker_id: 3, value: 'unavailable' }],
      1,
      3
    )
    expect(result.bookmakers.map((bookmaker) => bookmaker.id)).toEqual([3])
    expect(result.rows[0].highest).toBeNull()
  })
})
