import { describe, expect, it } from 'vitest'
import type { SportmonksEvent, SportmonksPressure } from '@shared/contracts'
import { pressureChartData } from './pressure-data'

function point(
  id: number,
  participant: number,
  minute: number,
  pressure: number
): SportmonksPressure {
  return { id, fixture_id: 10, participant_id: participant, minute, pressure }
}
function event(
  id: number,
  type: number,
  minute: number,
  overrides: Partial<SportmonksEvent> = {}
): SportmonksEvent {
  return {
    id,
    fixture_id: 10,
    participant_id: 1,
    period_id: 5,
    type_id: type,
    minute,
    ...overrides
  }
}

describe('pressure chart data', () => {
  it('keeps exact team values, including zero, and does not fill missing minutes', () => {
    const chart = pressureChartData(
      [point(1, 1, 6, 10.92), point(2, 2, 6, 0), point(3, 1, 4, 110.3), point(4, 99, 2, 200)],
      [],
      1,
      2
    )
    expect(chart.readings).toEqual([
      { minute: 4, home: 110.3, away: null },
      { minute: 6, home: 10.92, away: 0 }
    ])
    expect(chart.maximum).toBe(125)
    expect(chart.endMinute).toBe(6)
  })

  it('uses the latest record when the provider repeats a team and minute', () => {
    const chart = pressureChartData([point(2, 1, 5, 25), point(1, 1, 5, 10)], [], 1, 2)
    expect(chart.readings).toEqual([{ minute: 5, home: 25, away: null }])
  })

  it('marks goals and dismissals with original added-time labels, excluding rescinded events', () => {
    const chart = pressureChartData(
      [point(1, 1, 96, 0)],
      [
        event(1, 14, 45, { extra_minute: 2, player_name: 'Scorer' }),
        event(2, 16, 70, { participant_id: 2 }),
        event(3, 15, 72),
        event(4, 20, 80),
        event(5, 21, 90, { extra_minute: 3 }),
        event(6, 19, 12),
        event(7, 14, 15, { rescinded: true }),
        event(8, 14, 10, { participant_id: 99 })
      ],
      1,
      2
    )
    expect(
      chart.markers.map(({ minute, label, side, kind }) => ({ minute, label, side, kind }))
    ).toEqual([
      { minute: 47, label: '45+2′ · Goal · Scorer', side: 'home', kind: 'goal' },
      { minute: 70, label: '70′ · Penalty goal', side: 'away', kind: 'goal' },
      { minute: 72, label: '72′ · Own goal', side: 'home', kind: 'goal' },
      { minute: 80, label: '80′ · Red card', side: 'home', kind: 'red-card' },
      { minute: 93, label: '90+3′ · Second yellow', side: 'home', kind: 'red-card' }
    ])
  })

  it('does not invent a full match of zero pressure when nothing has been reported', () => {
    expect(pressureChartData([], [], 1, 2)).toMatchObject({
      readings: [],
      maximum: 25,
      endMinute: 1
    })
  })
})
