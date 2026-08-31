// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PlayerStatisticsView, TeamStatisticsView } from './statistics-views'

describe('PlayerStatisticsView', () => {
  it('keeps season navigation available when statistics are unavailable', () => {
    const onSeasonChange = vi.fn()

    render(
      <PlayerStatisticsView
        loaded
        loading={false}
        onSeasonChange={onSeasonChange}
        seasonId={2026}
        seasons={[
          {
            id: 2026,
            league_id: 1,
            name: '2026',
            is_current: true
          },
          {
            id: 2025,
            league_id: 1,
            name: '2025',
            is_current: false
          }
        ]}
        statistics={[]}
        teamId={10}
        teamName="Halfspace FC"
      />
    )

    const select = screen.getByRole('combobox', { name: 'Season' }) as HTMLSelectElement
    expect(select.value).toBe('2026')
    expect(screen.getByText('Stats not available')).toBeTruthy()

    fireEvent.change(select, { target: { value: '2025' } })

    expect(onSeasonChange).toHaveBeenCalledWith(2025)
  })
})

describe('TeamStatisticsView', () => {
  it('keeps season navigation available when statistics are unavailable', () => {
    const onSeasonChange = vi.fn()

    render(
      <TeamStatisticsView
        context="Allsvenskan"
        loaded
        loading={false}
        onSeasonChange={onSeasonChange}
        seasonId={2026}
        seasons={[
          {
            id: 2026,
            league_id: 1,
            name: '2026',
            is_current: true
          },
          {
            id: 2025,
            league_id: 1,
            name: '2025',
            is_current: false
          }
        ]}
        statistics={[]}
      />
    )

    const select = screen.getByRole('combobox', { name: 'Season' }) as HTMLSelectElement
    expect(select.value).toBe('2026')
    expect(screen.getByText('Stats not available')).toBeTruthy()

    fireEvent.change(select, { target: { value: '2025' } })

    expect(onSeasonChange).toHaveBeenCalledWith(2025)
  })
})
