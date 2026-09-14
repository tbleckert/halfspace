import { expect, it } from 'vitest'
import type { SportmonksOdd } from '@shared/contracts'
import { shortlistPrices, shortlistWindow } from './market-shortlist-data'

it('uses seven inclusive dates and keeps the current weekend on Sunday across month boundaries', () => {
  expect(shortlistWindow('2026-09-14', 'next-seven-days')).toEqual({
    startDate: '2026-09-14',
    endDate: '2026-09-20'
  })
  expect(shortlistWindow('2026-09-14', 'weekend')).toEqual({
    startDate: '2026-09-19',
    endDate: '2026-09-20'
  })
  expect(shortlistWindow('2026-09-20', 'weekend')).toEqual({
    startDate: '2026-09-19',
    endDate: '2026-09-20'
  })
  expect(shortlistWindow('2026-01-31', 'weekend')).toEqual({
    startDate: '2026-01-31',
    endDate: '2026-02-01'
  })
})

it('compares only active newest full-time result quotes from the exact match, preserving unknown outcomes', () => {
  const quote: SportmonksOdd = {
    id: 1,
    fixture_id: 10,
    market_id: 1,
    bookmaker_id: 7,
    label: '1',
    value: '2.00',
    latest_bookmaker_update: '2026-09-14 09:00:00'
  }
  const quotes = [
    quote,
    { ...quote, id: 2, value: '9.00', latest_bookmaker_update: '2026-09-14 08:00:00' },
    { ...quote, id: 3, bookmaker_id: 8, value: '8.00', suspended: true },
    { ...quote, id: 4, bookmaker_id: 9, value: '7.00', market_description: 'First Half Winner' },
    { ...quote, id: 5, bookmaker_id: 10, value: '6.00', handicap: '1' },
    { ...quote, id: 6, fixture_id: 11, value: '5.00' },
    {
      ...quote,
      id: 7,
      bookmaker_id: 11,
      label: 'Home',
      market_description: 'Fulltime Result',
      value: '2.20'
    },
    { ...quote, id: 8, label: 'X', value: '3.00', stopped: true }
  ]
  expect(
    shortlistPrices(quotes, 10, 'all').map(({ label, quote }) => [label, quote?.value ?? null])
  ).toEqual([
    ['Home', '2.20'],
    ['Draw', null],
    ['Away', null]
  ])
  expect(shortlistPrices(quotes, 10, 'home')).toHaveLength(1)
})
