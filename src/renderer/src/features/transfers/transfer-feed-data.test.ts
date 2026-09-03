import { expect, it } from 'vitest'
import { transferRangeError } from './transfer-feed-data'

it('accepts at most 31 real calendar days', () => {
  expect(transferRangeError('2026-08-01', '2026-08-31')).toBeNull()
  expect(transferRangeError('2026-08-01', '2026-09-01')).toBeTruthy()
  expect(transferRangeError('2026-02-30', '2026-03-01')).toBeTruthy()
  expect(transferRangeError('2026-09-03', '2026-09-01')).toBeTruthy()
})
