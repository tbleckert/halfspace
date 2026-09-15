// @vitest-environment jsdom
import { useEffect, useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { ViewBlock } from '@shared/views'
import { ViewBlockGrid } from './view-block-grid'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function controlMeasurements(): { resize: () => void; disconnect: ReturnType<typeof vi.fn> } {
  let notify: ResizeObserverCallback
  let frame: FrameRequestCallback | undefined
  const disconnect = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        notify = callback
      }
      observe = vi.fn()
      disconnect = disconnect
    }
  )
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frame = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {
    frame = undefined
  })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    return { height: Number(this.dataset.height) } as DOMRect
  })
  return {
    resize: () =>
      act(() => {
        notify([], {} as ResizeObserver)
        frame?.(0)
      }),
    disconnect
  }
}

const blocks: ViewBlock[] = [2, 1, 1, 2].map((span, index) => ({
  id: String(index),
  type: 'team-next-match',
  teamId: 19,
  span: span as 1 | 2
}))
function Control({ id, load }: { id: string; load: () => void }): React.JSX.Element {
  useEffect(load, [load])
  const [value, setValue] = useState('')
  return (
    <input
      aria-label={`Filter ${id}`}
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  )
}
function Canvas({
  items = blocks,
  heights = [250, 500, 450, 350],
  load
}: {
  items?: ViewBlock[]
  heights?: number[]
  load: () => void
}): React.JSX.Element {
  return (
    <>
      <style>{'.view-block-grid { --view-columns: 3; row-gap: 24px; }'}</style>
      <ViewBlockGrid blocks={items} generating={false}>
        {items.map((block, index) => (
          <div
            key={block.id}
            className="view-block"
            data-span={block.span}
            data-height={heights[index]}
          >
            <Control id={block.id} load={load} />
          </div>
        ))}
      </ViewBlockGrid>
    </>
  )
}

it('remeasures growing content without replacing controls, changing their columns or losing focus', () => {
  const measurement = controlMeasurements()
  const load = vi.fn()
  const { rerender, unmount } = render(<Canvas load={load} />)
  const grid = screen.getByLabelText('View canvas')
  const controls = screen.getAllByRole('textbox')
  const columns = controls.map((input) =>
    input.parentElement!.style.getPropertyValue('--view-column')
  )
  expect(grid.style.height).toBe('974px')
  fireEvent.change(controls[2], { target: { value: 'Home' } })
  act(() => controls[2].focus())
  rerender(<Canvas load={load} heights={[400, 500, 650, 350]} />)
  measurement.resize()
  expect(grid.style.height).toBe('1174px')
  expect(screen.getAllByRole('textbox')).toEqual(controls)
  expect((controls[2] as HTMLInputElement).value).toBe('Home')
  expect(document.activeElement).toBe(controls[2])
  expect(
    controls.map((input) => input.parentElement!.style.getPropertyValue('--view-column'))
  ).toEqual(columns)
  expect(controls[3].parentElement!.style.getPropertyValue('--view-top')).toBe('424px')
  expect(load).toHaveBeenCalledTimes(4)
  unmount()
  expect(measurement.disconnect).toHaveBeenCalledTimes(1)
})

it('repacks for one column and for edited spans, additions, removals and order without remounting survivors', () => {
  const measurement = controlMeasurements()
  const load = vi.fn()
  const { rerender } = render(<Canvas load={load} />)
  const grid = screen.getByLabelText('View canvas')
  const first = screen.getByLabelText('Filter 0')
  grid.style.setProperty('--view-columns', '1')
  measurement.resize()
  expect(
    Array.from(grid.children).map((child) =>
      (child as HTMLElement).style.getPropertyValue('--view-top')
    )
  ).toEqual(['0px', '274px', '798px', '1272px'])
  expect(grid.style.height).toBe('1622px')
  const added: ViewBlock = { ...blocks[0], id: 'added', span: 3 }
  const edited = [blocks[3], { ...blocks[0], span: 3 as const }, added]
  rerender(<Canvas load={load} items={edited} heights={[100, 200, 300]} />)
  expect(screen.getAllByRole('textbox').map((input) => input.getAttribute('aria-label'))).toEqual([
    'Filter 3',
    'Filter 0',
    'Filter added'
  ])
  expect(screen.getByLabelText('Filter 0')).toBe(first)
  expect(grid.style.height).toBe('648px')
  expect(load).toHaveBeenCalledTimes(5)
})

it('keeps normal document flow when measurement is unavailable', () => {
  vi.stubGlobal('ResizeObserver', undefined)
  render(<Canvas load={vi.fn()} />)
  expect(screen.getByLabelText('View canvas').style.height).toBe('')
  expect(screen.getAllByRole('textbox')).toHaveLength(4)
})
