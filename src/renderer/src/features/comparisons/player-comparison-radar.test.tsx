// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { playerStatisticsSummary } from '@/features/statistics/statistics-data'
import { PlayerComparisonRadar } from './player-comparison-radar'

it('shows per-90 values with each season and its playing time, not percentile claims', () => {
  const empty = playerStatisticsSummary([])
  render(
    <PlayerComparisonRadar
      left={{ ...empty, minutes: 180, goals: 2, assists: 0, shots: 10, passes: 80 }}
      right={{ ...empty, minutes: 900, goals: 5, assists: 2, shots: 20, passes: 600 }}
      leftName="Alex"
      rightName="Alex"
      leftContext="Premier League · 2026/27"
      rightContext="Serie A · 2025/26"
    />
  )
  expect(screen.getByRole('img', { name: 'Per-90 radar: Alex versus Alex' })).toBeTruthy()
  const table = screen.getByRole('table', { name: 'Per-90 comparison' })
  expect(within(table).getByRole('row', { name: '1 Goals 0.5' })).toBeTruthy()
  expect(within(table).getByRole('row', { name: '40 Passes 60' })).toBeTruthy()
  expect(screen.getByText('Premier League · 2026/27')).toBeTruthy()
  expect(screen.getByText('Serie A · 2025/26')).toBeTruthy()
  expect(screen.getByText('180')).toBeTruthy()
  expect(screen.getByText(/not a league percentile/)).toBeTruthy()
})

it('does not draw a radar when there are too few shared reported metrics', () => {
  const empty = playerStatisticsSummary([])
  render(
    <PlayerComparisonRadar
      left={{ ...empty, minutes: 180, goals: 2 }}
      right={{ ...empty, minutes: 900, goals: 5 }}
      leftName="Alex"
      rightName="Jamie"
      leftContext="2026/27"
      rightContext="2025/26"
    />
  )
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.getByText('Not enough shared statistics for a radar.')).toBeTruthy()
})
