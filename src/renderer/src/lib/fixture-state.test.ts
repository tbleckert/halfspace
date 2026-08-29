import { describe, expect, it } from 'vitest'
import type { SportmonksFixture } from '@shared/contracts'
import {
  fixtureProgressLabel,
  fixtureRowStatus,
  isFixtureLive,
  isFixtureOngoing
} from './fixture-state'

describe('fixture state', () => {
  it.each([2, 6, 9, 22])('recognises live state %s', (stateId) => {
    expect(isFixtureLive(stateId)).toBe(true)
  })

  it.each([1, 3, 5, 8])('does not mark state %s as live', (stateId) => {
    expect(isFixtureLive(stateId)).toBe(false)
  })

  it.each([2, 3, 6, 9, 22])('recognises ongoing state %s', (stateId) => {
    expect(isFixtureOngoing(stateId)).toBe(true)
  })

  it('shows the current minute for a ticking period', () => {
    expect(
      fixtureProgressLabel(
        fixture({
          state_id: 22,
          periods: [period({ counts_from: 45, minutes: 68, period_length: 45 })]
        })
      )
    ).toBe('68′')
  })

  it('formats stoppage time using football notation', () => {
    expect(
      fixtureProgressLabel(
        fixture({
          state_id: 2,
          periods: [period({ counts_from: 0, minutes: 47, period_length: 45 })]
        })
      )
    ).toBe('45+2′')
  })

  it('shows a status label while the fixture is at half-time', () => {
    expect(
      fixtureProgressLabel(
        fixture({
          state_id: 3,
          state: { id: 3, name: 'Half Time', short_name: 'HT' }
        })
      )
    ).toBe('HT')
  })

  it('does not replace kickoff time for a fixture that has not started', () => {
    expect(fixtureProgressLabel(fixture({ state_id: 1 }))).toBeNull()
  })

  it('uses kickoff time as the row status before a fixture starts', () => {
    expect(
      fixtureRowStatus(
        fixture({
          state_id: 1,
          state: { id: 1, name: 'Not Started', short_name: 'NS' }
        })
      )
    ).toEqual({ kind: 'kickoff' })
  })

  it('uses the current minute as the row status during play', () => {
    expect(
      fixtureRowStatus(
        fixture({
          state_id: 22,
          periods: [period({ counts_from: 45, minutes: 66, period_length: 45 })]
        })
      )
    ).toEqual({ kind: 'in-play', label: '66′' })
  })

  it('uses the short state label as the row status after a fixture ends', () => {
    expect(
      fixtureRowStatus(
        fixture({
          state_id: 5,
          state: { id: 5, name: 'Full Time', short_name: 'FT' }
        })
      )
    ).toEqual({ kind: 'state', label: 'FT' })
  })
})

function fixture(overrides: Partial<SportmonksFixture>): SportmonksFixture {
  return {
    id: 1,
    league_id: 8,
    season_id: 1,
    state_id: 1,
    placeholder: false,
    has_odds: false,
    participants: [],
    scores: [],
    ...overrides
  }
}

function period(
  overrides: Record<string, unknown>
): NonNullable<SportmonksFixture['periods']>[number] {
  return {
    id: 1,
    fixture_id: 1,
    type_id: 2,
    started: 1,
    ended: null,
    counts_from: 45,
    ticking: true,
    sort_order: 2,
    description: '2nd-half',
    time_added: null,
    period_length: 45,
    minutes: 68,
    seconds: 0,
    has_timer: true,
    ...overrides
  }
}
