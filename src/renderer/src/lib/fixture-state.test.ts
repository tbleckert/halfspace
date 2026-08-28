import { describe, expect, it } from 'vitest'
import { isFixtureLive } from './fixture-state'

describe('fixture state', () => {
  it.each([2, 6, 9, 22])('recognises live state %s', (stateId) => {
    expect(isFixtureLive(stateId)).toBe(true)
  })

  it.each([1, 3, 5, 8])('does not mark state %s as live', (stateId) => {
    expect(isFixtureLive(stateId)).toBe(false)
  })
})
