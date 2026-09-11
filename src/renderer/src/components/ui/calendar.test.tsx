// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Calendar } from './calendar'

it('keeps the focused day selectable when its parent rerenders', () => {
  const onSelect = vi.fn()
  const props = {
    defaultMonth: new Date(2026, 8, 4),
    mode: 'single' as const,
    selected: new Date(2026, 8, 4),
    onSelect
  }
  const { rerender } = render(<Calendar {...props} />)
  const day = screen.getByRole('button', { name: /Friday, September 11/ })

  act(() => day.focus())
  expect(document.activeElement).toBe(day)

  rerender(<Calendar {...props} />)

  expect(document.activeElement).toBe(day)
  fireEvent.click(day)
  expect(onSelect).toHaveBeenCalledOnce()
  expect(onSelect.mock.calls[0][0]).toEqual(new Date(2026, 8, 11))
})
