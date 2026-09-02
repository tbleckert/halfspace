import { describe, expect, it } from 'vitest'
import { makeTopscorer } from '../../../../test/topscorer-fixtures'
import { leadingPlayers } from './player-leaders-data'

describe('player leader highlights', () => {
  it('finds the highest total within each category', () => {
    const rows = [
      makeTopscorer({ id: 2, total: 8, position: 2 }),
      makeTopscorer({ id: 3, type_id: 209, total: 20 }),
      makeTopscorer({ id: 1, total: 12 })
    ]
    expect(leadingPlayers(rows, 208).map(({ id }) => id)).toEqual([1])
    expect(leadingPlayers(rows, 209).map(({ id }) => id)).toEqual([3])
  })

  it('recognizes equal totals as a shared lead even when provider ranks differ', () => {
    const rows = [
      makeTopscorer({ id: 2, position: 2, total: 12 }),
      makeTopscorer({ id: 3, position: 3, total: 10 }),
      makeTopscorer({ id: 1, position: 1, total: 12 })
    ]
    expect(leadingPlayers(rows, 208).map(({ id }) => id)).toEqual([1, 2])
    expect(rows[0].id).toBe(2)
  })

  it('does not invent leaders for empty or zero-total categories', () => {
    expect(leadingPlayers([], 208)).toEqual([])
    expect(leadingPlayers([makeTopscorer({ total: 0 })], 208)).toEqual([])
    expect(leadingPlayers([makeTopscorer()], 209)).toEqual([])
  })
})
