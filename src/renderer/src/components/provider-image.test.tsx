// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProviderImage } from './provider-image'

describe('ProviderImage', () => {
  it('shows its fallback after a failed image and retries when connectivity changes', () => {
    const props = {
      fallback: <span>Fallback</span>,
      imageClassName: 'image',
      imagePath: 'https://cdn.sportmonks.com/images/football/team.png'
    }
    const { container, rerender } = render(<ProviderImage {...props} online />)
    const image = container.querySelector('img')
    expect(image).not.toBeNull()

    fireEvent.error(image!)
    expect(screen.getByText('Fallback')).toBeTruthy()

    rerender(<ProviderImage {...props} online={false} />)
    expect(container.querySelector('img')).not.toBeNull()
  })
})
