import { describe, expect, it } from 'vitest'
import { fixtureCacheExpiry, isIsoDate } from './date'

describe('date utilities', () => {
  it('rejects impossible calendar dates', () => {
    expect(isIsoDate('2026-02-28')).toBe(true)
    expect(isIsoDate('2026-02-30')).toBe(false)
  })

  it('keeps future fixtures for six hours', () => {
    const fetchedAt = Date.now()
    expect(fixtureCacheExpiry('2099-01-01', 'UTC', fetchedAt)).toBe(fetchedAt + 6 * 60 * 60 * 1000)
  })
})
