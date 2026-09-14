// @vitest-environment jsdom
import { useEffect, useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { ViewBlock } from '@shared/views'
import { ViewBlockContainer } from './view-block-container'

const block: ViewBlock = { id: 'next', type: 'team-next-match', teamId: 19, span: 2 }
afterEach(() => vi.unstubAllGlobals())

function controlVisibility(): {
  enter: () => void
  leave: () => void
  disconnect: ReturnType<typeof vi.fn>
} {
  let notify: IntersectionObserverCallback
  const disconnect = vi.fn()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        notify = callback
      }
      observe = vi.fn()
      disconnect = disconnect
    }
  )
  const intersect = (isIntersecting: boolean): void => {
    act(() => notify([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver))
  }
  return { enter: () => intersect(true), leave: () => intersect(false), disconnect }
}

function Content({ load }: { load: () => void }): React.JSX.Element {
  useEffect(load, [load])
  const [value, setValue] = useState('')
  return (
    <input
      aria-label="Widget filter"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  )
}

it('defers child queries until approach, then keeps controls and content mounted', () => {
  const visibility = controlVisibility()
  const load = vi.fn()
  const { rerender } = render(
    <ViewBlockContainer block={block} defer>
      <Content load={load} />
    </ViewBlockContainer>
  )
  expect(load).not.toHaveBeenCalled()
  expect(screen.queryByLabelText('Widget filter')).toBeNull()
  visibility.leave()
  expect(load).not.toHaveBeenCalled()
  visibility.enter()
  expect(load).toHaveBeenCalledTimes(1)
  fireEvent.change(screen.getByLabelText('Widget filter'), { target: { value: 'Home' } })
  visibility.leave()
  rerender(
    <ViewBlockContainer block={{ ...block, span: 1 }} defer>
      <Content load={load} />
    </ViewBlockContainer>
  )
  expect((screen.getByLabelText('Widget filter') as HTMLInputElement).value).toBe('Home')
  expect(load).toHaveBeenCalledTimes(1)
  expect(visibility.disconnect).toHaveBeenCalled()
})

it('loads on keyboard focus without removing the focused element', () => {
  controlVisibility()
  const load = vi.fn()
  render(
    <ViewBlockContainer block={block} defer>
      <Content load={load} />
    </ViewBlockContainer>
  )
  const container = screen.getByLabelText('team-next-match widget, 2 columns')
  expect(container.tabIndex).toBe(0)
  act(() => container.focus())
  expect(load).toHaveBeenCalledTimes(1)
  expect(document.activeElement).toBe(container)
  expect(container.tabIndex).toBe(-1)
  expect(screen.getByLabelText('Widget filter')).toBeTruthy()
})

it('disconnects when a deferred widget is removed', () => {
  const visibility = controlVisibility()
  const load = vi.fn()
  const { unmount } = render(
    <ViewBlockContainer block={block} defer>
      <Content load={load} />
    </ViewBlockContainer>
  )
  unmount()
  expect(visibility.disconnect).toHaveBeenCalledTimes(1)
  expect(load).not.toHaveBeenCalled()
})

it('shows generation outlines immediately and remains usable without an observer', () => {
  controlVisibility()
  const { unmount } = render(
    <ViewBlockContainer block={block} defer={false}>
      Draft outline
    </ViewBlockContainer>
  )
  expect(screen.getByText('Draft outline')).toBeTruthy()
  unmount()
  vi.stubGlobal('IntersectionObserver', undefined)
  render(
    <ViewBlockContainer block={block} defer>
      Football content
    </ViewBlockContainer>
  )
  expect(screen.getByText('Football content')).toBeTruthy()
})
