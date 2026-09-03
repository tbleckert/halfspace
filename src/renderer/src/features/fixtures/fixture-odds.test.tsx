// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { SportmonksOdd } from '@shared/contracts'
import { FixtureOdds } from './fixture-odds'

it('offers feed and market navigation, and displays comparable prices with explicit stopped states', () => {
  const quote: SportmonksOdd = {
    id: 1,
    fixture_id: 10,
    market_id: 1,
    bookmaker_id: 2,
    label: 'Home',
    value: '1.80',
    market: { id: 1, name: 'Fulltime Result' },
    bookmaker: { id: 2, name: 'Book A' }
  }
  const odds = [
    quote,
    {
      ...quote,
      id: 2,
      bookmaker_id: 3,
      bookmaker: { id: 3, name: 'Book B' },
      value: '2.00',
      stopped: true
    }
  ]
  const onSelect = vi.fn()
  render(
    <FixtureOdds
      odds={odds}
      feed="pre-match"
      live={false}
      access="included"
      loading={false}
      offline={false}
      fetchedAt={1000}
      onSelect={onSelect}
    />
  )
  const table = screen.getByRole('table', { name: 'Bookmaker odds comparison' })
  expect(within(table).getAllByRole('row')).toHaveLength(2)
  expect(within(table).getByText('1.80')).toBeTruthy()
  expect(within(table).getByText('Stopped')).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox', { name: 'Odds bookmaker' }), {
    target: { value: '3' }
  })
  expect(onSelect).toHaveBeenLastCalledWith({ oddsFeed: 'pre-match', market: 1, bookmaker: 3 })
  fireEvent.click(screen.getByRole('button', { name: 'In-play' }))
  expect(onSelect).toHaveBeenLastCalledWith({ oddsFeed: 'inplay' })
})

it('distinguishes unavailable offline data from an empty cached selection', () => {
  const props = {
    odds: [],
    feed: 'pre-match' as const,
    live: false,
    access: 'included' as const,
    loading: false,
    offline: true,
    onSelect: vi.fn()
  }
  const { rerender } = render(<FixtureOdds {...props} />)
  expect(screen.getByText('Odds not available offline.')).toBeTruthy()
  rerender(<FixtureOdds {...props} fetchedAt={1000} />)
  expect(screen.getByText('No odds for this selection.')).toBeTruthy()
})
