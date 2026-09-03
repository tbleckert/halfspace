// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { intentPrefetchProps } from './prefetch'

afterEach(() => vi.useRealTimers())

describe('prefetch interactions', () => {
  it('starts immediately on focus and after a deliberate hover', async () => {
    vi.useFakeTimers()
    const prefetch = vi.fn(async () => undefined)
    const { getByRole } = render(
      <a href="#team" {...intentPrefetchProps(true, prefetch)}>
        Team
      </a>
    )
    fireEvent.mouseEnter(getByRole('link'))
    expect(prefetch).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(80)
    expect(prefetch).toHaveBeenCalledTimes(1)
    fireEvent.focus(getByRole('link'))
    expect(prefetch).toHaveBeenCalledTimes(2)
  })

  it('cancels incidental hover work when the pointer leaves', async () => {
    vi.useFakeTimers()
    const prefetch = vi.fn(async () => undefined)
    const { getByRole } = render(
      <a href="#team" {...intentPrefetchProps(true, prefetch)}>
        Team
      </a>
    )
    fireEvent.mouseEnter(getByRole('link'))
    fireEvent.mouseLeave(getByRole('link'))
    await vi.advanceTimersByTimeAsync(80)
    expect(prefetch).not.toHaveBeenCalled()
  })

  it('cancels an incidental hover even if the link rerendered before the pointer left', async () => {
    vi.useFakeTimers()
    const prefetch = vi.fn(async () => undefined)
    function Link({ label }: { label: string }): React.JSX.Element {
      return (
        <a href="#team" {...intentPrefetchProps(true, prefetch)}>
          {label}
        </a>
      )
    }
    const { getByRole, rerender } = render(<Link label="Team" />)
    fireEvent.mouseEnter(getByRole('link'))
    rerender(<Link label="Updated team" />)
    fireEvent.mouseLeave(getByRole('link'))
    await vi.advanceTimersByTimeAsync(80)
    expect(prefetch).not.toHaveBeenCalled()
  })

  it('does not prefetch after the hovered link has unmounted', async () => {
    vi.useFakeTimers()
    const prefetch = vi.fn(async () => undefined)
    const { getByRole, unmount } = render(
      <a href="#team" {...intentPrefetchProps(true, prefetch)}>
        Team
      </a>
    )
    fireEvent.mouseEnter(getByRole('link'))
    unmount()
    await vi.advanceTimersByTimeAsync(80)
    expect(prefetch).not.toHaveBeenCalled()
  })
})
