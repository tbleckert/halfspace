import { fireEvent, screen, waitFor } from '@testing-library/react'
import { expect } from 'vitest'

export async function selectOption(trigger: HTMLElement, label: string | RegExp): Promise<void> {
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  const option = await screen.findByRole('option', { name: label })
  fireEvent.pointerDown(option, { pointerType: 'mouse' })
  fireEvent.click(option)
  await waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'))
}
