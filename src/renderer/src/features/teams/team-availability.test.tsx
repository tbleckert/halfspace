// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SportmonksSidelined } from '@shared/contracts'
import { TeamAvailability } from './team-availability'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/player">{children}</a>
}))

const injury: SportmonksSidelined = {
  id: 1,
  player_id: 101,
  team_id: 9,
  season_id: null,
  type_id: 500,
  category: 'injury',
  start_date: '2026-08-10',
  end_date: null,
  completed: false,
  games_missed: 3,
  type: { id: 500, name: 'Ankle injury' }
}

describe('current team availability', () => {
  it('shows reported injuries and suspensions without completed absences or invented return dates', () => {
    render(
      <TeamAvailability
        online={false}
        teamId={9}
        absences={[
          injury,
          {
            ...injury,
            id: 2,
            category: 'suspension',
            player_id: 102,
            type: { id: 501, name: 'Suspended' }
          },
          { ...injury, id: 3, completed: true, type: { id: 502, name: 'Recovered injury' } }
        ]}
      />
    )
    expect(screen.getByText('Ankle injury')).toBeTruthy()
    expect(screen.getByText('Suspended')).toBeTruthy()
    expect(screen.queryByText('Recovered injury')).toBeNull()
    expect(screen.queryByText(/return/i)).toBeNull()
    expect(screen.getAllByRole('link', { name: /3 matches missed/ })).toHaveLength(2)
  })

  it('distinguishes unreported data from an empty provider response', () => {
    const { rerender } = render(<TeamAvailability online={false} teamId={9} />)
    expect(screen.getByText('Absence data unavailable')).toBeTruthy()
    rerender(<TeamAvailability online={false} teamId={9} absences={[]} />)
    expect(screen.getByText('No absences reported')).toBeTruthy()
  })
})
