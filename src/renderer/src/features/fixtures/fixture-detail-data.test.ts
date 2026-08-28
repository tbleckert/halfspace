import { describe, expect, it } from 'vitest'
import type { SportmonksEvent, SportmonksFixtureStatistic, SportmonksOdd } from '@shared/contracts'
import { fixtureOddsGroups, fixtureStatisticRows, sortedFixtureEvents } from './fixture-detail-data'

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

  it('groups odds by market and bookmaker', () => {
    const odds = [
      {
        id: 1,
        market_id: 1,
        bookmaker_id: 2,
        label: 'Home',
        value: '1.80',
        market: { id: 1, name: 'Fulltime Result' },
        bookmaker: { id: 2, name: 'Nordic Bet' }
      },
      {
        id: 2,
        market_id: 1,
        bookmaker_id: 2,
        label: 'Away',
        value: '4.20',
        market: { id: 1, name: 'Fulltime Result' },
        bookmaker: { id: 2, name: 'Nordic Bet' }
      }
    ] as SportmonksOdd[]

    expect(fixtureOddsGroups(odds)).toMatchObject([
      {
        market: 'Fulltime Result',
        bookmaker: 'Nordic Bet',
        odds: [{ label: 'Away' }, { label: 'Home' }]
      }
    ])
  })
})
