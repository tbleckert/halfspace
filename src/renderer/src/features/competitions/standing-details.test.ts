import { describe, expect, it } from 'vitest'
import { recentStandingForm, standingDetailValue } from './standing-details'

describe('standing details', () => {
  it('uses the requested provider total, including zero and negative values', () => {
    const details = [
      { id: 1, type_id: 129, value: 0 },
      { id: 2, type_id: 179, value: -3 },
      { id: 3, type_id: 135, value: 12 }
    ]
    expect(standingDetailValue(details, 129)).toBe(0)
    expect(standingDetailValue(details, 179)).toBe(-3)
    expect(standingDetailValue(details, 130)).toBeNull()
    expect(standingDetailValue(undefined, 129)).toBeNull()
  })

  it('shows the five most recent reported results, oldest to newest', () => {
    const form = [6, 2, 4, 1, 5, 3].map((order) => ({
      id: order,
      fixture_id: 100 + order,
      form: order % 2 ? 'W' : 'D',
      sort_order: order
    }))
    expect(recentStandingForm(form).map(({ fixture_id }) => fixture_id)).toEqual([
      102, 103, 104, 105, 106
    ])
    expect(form[0].sort_order).toBe(6)
  })

  it('does not invent results for missing or unrecognized form', () => {
    expect(recentStandingForm(undefined)).toEqual([])
    expect(recentStandingForm([{ id: 1, fixture_id: 1, form: '?', sort_order: 1 }])).toEqual([])
  })
})
