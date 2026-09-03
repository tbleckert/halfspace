import { describe, expect, it } from 'vitest'
import type {
  SportmonksEvent,
  SportmonksFixtureStatistic,
  SportmonksLineup
} from '@shared/contracts'
import {
  fixtureFormationLabel,
  fixtureFormationLines,
  fixturePlayerPerformances,
  fixturePlayerAnnotations,
  fixtureStatisticRows,
  fixtureStatisticShare,
  sortedFixtureEvents
} from './fixture-detail-data'

describe('fixture detail data', () => {
  it('orders events by match time', () => {
    const event = (
      id: number,
      minute: number,
      extraMinute: number | null = null
    ): SportmonksEvent => ({ id, minute, extra_minute: extraMinute }) as SportmonksEvent

    expect(
      sortedFixtureEvents([event(3, 45, 3), event(1, 12), event(2, 45, 1)]).map(({ id }) => id)
    ).toEqual([1, 2, 3])
  })

  it('uses provider event order when events share a minute', () => {
    const events = [event(1, 54, 3), event(3, 54, 1), event(2, 54, 2)] as Array<
      SportmonksEvent & { sort_order: number }
    >

    expect(sortedFixtureEvents(events).map(({ id }) => id)).toEqual([3, 2, 1])
  })

  it('keeps match chronology when provider sort order places a substitution before an earlier goal', () => {
    const events = [event(1, 4, 1), event(2, 46, 3), event(3, 23, 4), event(4, 46, 5)]
    expect(sortedFixtureEvents(events).map(({ id }) => id)).toEqual([1, 3, 2, 4])
  })

  it('orders stoppage time before using the provider tie-breaker', () => {
    const events = [
      { ...event(1, 45, 1), extra_minute: 3 },
      { ...event(2, 45, 2), extra_minute: 1 },
      event(3, 46, 0)
    ]
    expect(sortedFixtureEvents(events).map(({ id }) => id)).toEqual([2, 1, 3])
  })

  it('pairs fixture statistics by location', () => {
    const statistics = [
      {
        id: 1,
        type_id: 42,
        location: 'away',
        data: { value: 7 },
        type: { id: 42, name: 'Shots' }
      },
      {
        id: 2,
        type_id: 42,
        location: 'home',
        data: { value: 12 },
        type: { id: 42, name: 'Shots' }
      }
    ] as SportmonksFixtureStatistic[]

    expect(fixtureStatisticRows(statistics)).toEqual([
      { id: 42, label: 'Shots', home: 12, away: 7, group: null }
    ])
  })

  it('calculates a proportional share for comparable fixture statistics', () => {
    const share = fixtureStatisticShare(7, 11)
    expect(share?.home).toBeCloseTo(38.89)
    expect(share?.away).toBeCloseTo(61.11)
    expect(fixtureStatisticShare('33%', '67%')).toEqual({ home: 33, away: 67 })
    expect(fixtureStatisticShare(0, 0)).toBeNull()
    expect(fixtureStatisticShare('unknown', 4)).toBeNull()
  })

  it('builds position-relevant player performance summaries', () => {
    const defender = {
      ...lineup(4, '2:1'),
      position_id: 25,
      details: [
        detail(118, 7.46),
        detail(119, 90),
        detail(78, 3),
        detail(100, 2),
        detail(106, 7),
        detail(42, 1)
      ]
    }
    const goalkeeper = {
      ...lineup(1, '1:1'),
      position_id: 24,
      details: [detail(118, 8.1), detail(119, 90), detail(57, 5), detail(80, 31)]
    }

    expect(fixturePlayerPerformances([defender, goalkeeper])).toMatchObject([
      {
        entry: { player_id: 1 },
        rating: 8.1,
        minutes: 90,
        metrics: [
          { label: 'Saves', value: 5 },
          { label: 'Passes', value: 31 }
        ]
      },
      {
        entry: { player_id: 4 },
        rating: 7.46,
        minutes: 90,
        metrics: [
          { label: 'Tackles', value: 3 },
          { label: 'Interceptions', value: 2 },
          { label: 'Duels won', value: 7 }
        ]
      }
    ])
  })

  it('groups a complete starting formation by row and slot', () => {
    const starters = [
      lineup(1, '1:1'),
      lineup(2, '2:2'),
      lineup(3, '2:1'),
      lineup(4, '2:4'),
      lineup(5, '2:3'),
      lineup(6, '3:3'),
      lineup(7, '3:1'),
      lineup(8, '3:2'),
      lineup(9, '4:1'),
      lineup(10, '4:3'),
      lineup(11, '4:2')
    ]

    const lines = fixtureFormationLines(starters)

    expect(lines?.map(({ row, entries }) => ({ row, ids: entries.map(({ id }) => id) }))).toEqual([
      { row: 1, ids: [1] },
      { row: 2, ids: [3, 2, 5, 4] },
      { row: 3, ids: [7, 8, 6] },
      { row: 4, ids: [9, 11, 10] }
    ])
    expect(lines && fixtureFormationLabel(lines)).toBe('4-3-3')
  })

  it('falls back when a starting formation is incomplete', () => {
    const incomplete = Array.from({ length: 10 }, (_, index) => lineup(index + 1, `2:${index + 1}`))
    const malformed = Array.from({ length: 11 }, (_, index) =>
      lineup(index + 1, index === 10 ? 'left wing' : `2:${index + 1}`)
    )

    expect(fixtureFormationLines(incomplete)).toBeNull()
    expect(fixtureFormationLines(malformed)).toBeNull()
  })

  it('indexes goals, assists, cards, and substitutions by player', () => {
    const events = [
      matchEvent(1, 14, 9, 8, 24),
      matchEvent(2, 19, 8, null, 41),
      matchEvent(3, 18, 12, 9, 67),
      matchEvent(4, 20, 4, null, 82),
      { ...matchEvent(5, 14, 4, null, 90), rescinded: true }
    ]

    const annotations = fixturePlayerAnnotations(events)

    expect(annotations.get(9)).toMatchObject([
      { eventId: 1, kind: 'goal', label: 'Goal', minute: 24 },
      { eventId: 3, kind: 'substitution-off', label: 'Substituted off', minute: 67 }
    ])
    expect(annotations.get(8)).toMatchObject([
      { eventId: 1, kind: 'assist', label: 'Assist', minute: 24 },
      { eventId: 2, kind: 'yellow-card', label: 'Yellow card', minute: 41 }
    ])
    expect(annotations.get(12)).toMatchObject([
      { eventId: 3, kind: 'substitution-on', label: 'Substituted on', minute: 67 }
    ])
    expect(annotations.get(4)).toMatchObject([
      { eventId: 4, kind: 'red-card', label: 'Red card', minute: 82 }
    ])
  })
})

function event(id: number, minute: number, sortOrder: number): SportmonksEvent {
  return {
    id,
    fixture_id: 1,
    period_id: 1,
    participant_id: 1,
    type_id: 14,
    minute,
    sort_order: sortOrder
  } as SportmonksEvent
}

function matchEvent(
  id: number,
  typeId: number,
  playerId: number,
  relatedPlayerId: number | null,
  minute: number
): SportmonksEvent {
  return {
    id,
    fixture_id: 1,
    period_id: 1,
    participant_id: 1,
    type_id: typeId,
    player_id: playerId,
    related_player_id: relatedPlayerId,
    minute
  }
}

function lineup(id: number, formationField: string): SportmonksLineup {
  return {
    id,
    fixture_id: 1,
    player_id: id,
    team_id: 1,
    position_id: null,
    type_id: 11,
    formation_field: formationField,
    player_name: `Player ${id}`,
    jersey_number: id
  }
}

function detail(typeId: number, value: number): NonNullable<SportmonksLineup['details']>[number] {
  return {
    id: typeId,
    fixture_id: 1,
    player_id: 1,
    team_id: 1,
    lineup_id: 1,
    type_id: typeId,
    data: { value }
  }
}
