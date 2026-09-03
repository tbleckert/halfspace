// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import type { FixturePressureQuery } from '@/data/db'
import type { SportmonksEvent } from '@shared/contracts'
import { FixturePressure } from './fixture-pressure'

const cached: FixturePressureQuery = {
  fixtureId: 10,
  fetchedAt: 1000,
  staleAt: 3601000,
  points: [
    { id: 1, fixture_id: 10, participant_id: 1, minute: 1, pressure: 10.92 },
    { id: 2, fixture_id: 10, participant_id: 2, minute: 1, pressure: 0 },
    { id: 3, fixture_id: 10, participant_id: 2, minute: 3, pressure: 92.24 }
  ]
}
const props = {
  cached,
  error: null,
  access: 'included' as const,
  events: [] as SportmonksEvent[],
  home: { id: 1, name: 'Lecce' },
  away: { id: 2, name: 'Roma' },
  online: false
}

it('lets keyboard users inspect exact values and distinguish missing readings from zero', () => {
  render(<FixturePressure {...props} />)
  const chart = screen.getByRole('slider', { name: 'Pressure by minute' })
  fireEvent.focus(chart)
  expect(within(screen.getByRole('tooltip')).getByText('10.92')).toBeTruthy()
  expect(within(screen.getByRole('tooltip')).getByText('0')).toBeTruthy()
  fireEvent.keyDown(chart, { key: 'ArrowRight' })
  expect(within(screen.getByRole('tooltip')).getAllByText('–')).toHaveLength(2)
  expect(chart.getAttribute('aria-valuetext')).toContain('Roma not reported')
  fireEvent.keyDown(chart, { key: 'End' })
  expect(within(screen.getByRole('tooltip')).getByText('92.24')).toBeTruthy()
  fireEvent.pointerLeave(chart)
  fireEvent.keyDown(chart, { key: 'ArrowLeft' })
  expect(chart.getAttribute('aria-valuenow')).toBe('2')
  fireEvent.keyDown(chart, { key: 'Escape' })
  expect(screen.queryByRole('tooltip')).toBeNull()
})

it('exposes every event sharing a marker minute on focus and touch', () => {
  const goal: SportmonksEvent = {
    id: 1,
    fixture_id: 10,
    participant_id: 1,
    period_id: 1,
    type_id: 14,
    minute: 45,
    extra_minute: 2,
    player_name: 'Scorer'
  }
  const red: SportmonksEvent = { ...goal, id: 2, type_id: 20, player_name: 'Defender' }
  render(<FixturePressure {...props} events={[goal, red]} />)
  const marker = screen.getByRole('button', {
    name: '45+2′ · Goal · Scorer; 45+2′ · Red card · Defender'
  })
  fireEvent.focus(marker)
  expect(within(screen.getByRole('tooltip')).getByText('45+2′ · Goal · Scorer')).toBeTruthy()
  expect(within(screen.getByRole('tooltip')).getByText('45+2′ · Red card · Defender')).toBeTruthy()
  fireEvent.blur(marker)
  fireEvent.click(marker)
  expect(screen.getByRole('tooltip')).toBeTruthy()
})

it('keeps cached readings visible during provider failures', () => {
  render(<FixturePressure {...props} error="Rate limit reached." />)
  expect(screen.getByRole('slider', { name: 'Pressure by minute' })).toBeTruthy()
})

it('keeps unavailable fixture data distinct from uncached offline data', () => {
  const { rerender } = render(<FixturePressure {...props} cached={{ ...cached, points: [] }} />)
  expect(screen.getByText('Pressure not available for this fixture.')).toBeTruthy()
  expect(screen.queryByText(/plan/)).toBeNull()
  rerender(<FixturePressure {...props} cached={null} />)
  expect(screen.getByText('Pressure not available offline.')).toBeTruthy()
})
