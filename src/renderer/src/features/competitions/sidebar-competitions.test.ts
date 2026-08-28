import { describe, expect, it } from 'vitest'
import { sidebarCompetitions } from './sidebar-competitions'

describe('sidebar competitions', () => {
  it('shows every active competition when exactly ten are available', () => {
    const competitions = Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      name: `Competition ${String(10 - index).padStart(2, '0')}`,
      active: true
    }))

    expect(sidebarCompetitions(competitions, [])).toHaveLength(10)
    expect(sidebarCompetitions(competitions, []).map(({ name }) => name)).toEqual(
      [...competitions]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map(({ name }) => name)
    )
  })

  it('shows only pinned competitions when more than ten are available', () => {
    const competitions = Array.from({ length: 11 }, (_, index) => ({
      id: index + 1,
      name: `Competition ${String(index + 1).padStart(2, '0')}`,
      active: true
    }))

    expect(sidebarCompetitions(competitions, [11, 3, 999]).map(({ id }) => id)).toEqual([3, 11])
  })

  it('does not count or display inactive competitions', () => {
    const competitions = [
      ...Array.from({ length: 10 }, (_, index) => ({
        id: index + 1,
        name: `Active ${index + 1}`,
        active: true
      })),
      { id: 11, name: 'Archived', active: false }
    ]

    expect(sidebarCompetitions(competitions, []).map(({ id }) => id)).toHaveLength(10)
  })
})
