import { describe, expect, it } from 'vitest'
import { addDaysToIsoDate, fixtureCacheExpiry, isIsoDate, isoDateInTimeZone } from './date'

describe('date utilities', () => {
  it('rejects impossible calendar dates', () => {
    expect(isIsoDate('2026-02-28')).toBe(true)
    expect(isIsoDate('2026-02-30')).toBe(false)
  })

  it('keeps future fixtures for six hours', () => {
    const fetchedAt = Date.now()
    expect(fixtureCacheExpiry('2099-01-01', 'UTC', fetchedAt)).toBe(fetchedAt + 6 * 60 * 60 * 1000)
  })

  it('moves ISO dates across month and year boundaries', () => {
    expect(addDaysToIsoDate('2026-12-28', 7)).toBe('2027-01-04')
    expect(addDaysToIsoDate('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('formats a timestamp as the calendar date in a time zone', () => {
    const timestamp = Date.UTC(2026, 7, 30, 22, 30)

    expect(isoDateInTimeZone(timestamp, 'Europe/Stockholm')).toBe('2026-08-31')
    expect(isoDateInTimeZone(timestamp, 'America/New_York')).toBe('2026-08-30')
  })
})
