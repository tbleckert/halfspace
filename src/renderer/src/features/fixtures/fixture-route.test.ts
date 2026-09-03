import { describe, expect, it } from 'vitest'
import { defaultFixtureView } from './fixture-route'

describe('default fixture view', () => {
  it.each([2, 3, 4, 5, 6, 7, 8, 9, 11, 15, 18, 21, 22, 25])(
    'opens Game for a match that has started (state %s)',
    (stateId) => expect(defaultFixtureView(stateId)).toBe('game')
  )

  it.each([1, 10, 12, 13, 14, 16, 17, 19, 20, 26, 0])(
    'keeps Preview when the state does not confirm play (state %s)',
    (stateId) => expect(defaultFixtureView(stateId)).toBe('preview')
  )
})
