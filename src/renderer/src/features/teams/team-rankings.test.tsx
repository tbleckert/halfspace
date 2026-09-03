// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { TeamRankings } from './team-rankings'

it('names the provider ranking system and preserves zero points without inventing a season', () => {
  render(
    <TeamRankings
      rankings={[{ id: 1, participant_id: 19, position: 16, points: 0, type: 'UEFA' }]}
    />
  )
  expect(screen.getByRole('heading', { name: 'Rankings' })).toBeTruthy()
  expect(screen.getByText('UEFA')).toBeTruthy()
  expect(screen.getByText('16')).toBeTruthy()
  expect(screen.getByText('0')).toBeTruthy()
  expect(screen.queryByText(/2026|world|global|updated/i)).toBeNull()
})

it('does not reserve a card for missing rankings', () => {
  const { container } = render(<TeamRankings rankings={[]} />)
  expect(container.textContent).toBe('')
})
