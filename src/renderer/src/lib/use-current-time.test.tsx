// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useCurrentTime } from './use-current-time'
import { useTodayInTimeZone } from './use-today'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
it('updates match time and the local day across midnight and when returning to the app', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-11T21:59:50Z'))
  const { result } = renderHook(() => ({
    now: useCurrentTime(),
    today: useTodayInTimeZone('Europe/Stockholm')
  }))
  expect(result.current.today).toBe('2026-09-11')
  act(() => {
    vi.advanceTimersByTime(60_000)
  })
  expect(result.current.today).toBe('2026-09-12')
  expect(result.current.now).toBe(Date.parse('2026-09-11T22:00:50Z'))
  act(() => {
    vi.setSystemTime(new Date('2026-09-13T10:00:00Z'))
    window.dispatchEvent(new Event('focus'))
  })
  expect(result.current.today).toBe('2026-09-13')
  expect(result.current.now).toBe(Date.parse('2026-09-13T10:00:00Z'))
})
