import { useLayoutEffect, useRef } from 'react'
import type { ViewBlock } from '@shared/views'
import { packViewWidgets } from './view-packing'

export function ViewBlockGrid({
  blocks,
  generating,
  children
}: {
  blocks: ViewBlock[]
  generating: boolean
  children: React.ReactNode
}): React.JSX.Element {
  const container = useRef<HTMLDivElement>(null)
  const composition = JSON.stringify([generating, blocks.map(({ id, span }) => [id, span])])

  useLayoutEffect(() => {
    const grid = container.current
    if (!grid || typeof ResizeObserver === 'undefined') return
    const widgets = Array.from(grid.querySelectorAll<HTMLDivElement>(':scope > .view-block'))
    if (!widgets.length) return

    let columns = 0
    let assignedColumns: number[] | undefined
    let frame = 0
    const measure = (): void => {
      if (!grid.clientWidth) return
      const style = getComputedStyle(grid)
      const availableColumns = Number(style.getPropertyValue('--view-columns'))
      if (!availableColumns) return

      // Recompose on a column-mode change or an explicit edit. Data refreshes and
      // deferred content only move cards vertically within their existing lanes.
      if (columns !== availableColumns) assignedColumns = undefined
      columns = availableColumns
      grid.dataset.packed = 'true'
      const layout = packViewWidgets(
        widgets.map((widget) => ({
          span: Number(widget.dataset.span),
          height: widget.getBoundingClientRect().height
        })),
        columns,
        Number.parseFloat(style.rowGap),
        assignedColumns
      )
      assignedColumns = layout.positions.map((position) => position.column)
      layout.positions.forEach((position, index) => {
        widgets[index].style.setProperty('--view-top', `${position.top}px`)
        widgets[index].style.setProperty('--view-column', String(position.column))
      })
      grid.style.height = `${layout.height}px`
    }
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    })
    observer.observe(grid)
    widgets.forEach((widget) => observer.observe(widget))
    measure()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      delete grid.dataset.packed
      grid.style.removeProperty('height')
      widgets.forEach((widget) => {
        widget.style.removeProperty('--view-top')
        widget.style.removeProperty('--view-column')
      })
    }
  }, [composition])

  // Retain the authored DOM order, component identity and native keyboard order.
  // Packing independent cards never rewrites the saved definition.
  return (
    <div
      ref={container}
      className="view-block-grid"
      aria-label="View canvas"
      aria-busy={generating}
    >
      {children}
    </div>
  )
}
