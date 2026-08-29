// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { intentPrefetchProps } from './prefetch'

afterEach(() => vi.useRealTimers())

describe('intent prefetch', () => {
  it('starts immediately on focus and after a deliberate hover', async () => {
    vi.useFakeTimers()
    const prefetch = vi.fn().mockResolvedValue(undefined)
    const props = intentPrefetchProps(true, prefetch)

    props.onMouseEnter()
    expect(prefetch).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(80)
    expect(prefetch).toHaveBeenCalledTimes(1)

    props.onFocus()
    expect(prefetch).toHaveBeenCalledTimes(2)
  })

  it('cancels incidental hover work when the pointer leaves', async () => {
    vi.useFakeTimers()
    const prefetch = vi.fn().mockResolvedValue(undefined)
    const props = intentPrefetchProps(true, prefetch)

    props.onMouseEnter()
    props.onMouseLeave()
    await vi.runAllTimersAsync()

    expect(prefetch).not.toHaveBeenCalled()
  })
})
