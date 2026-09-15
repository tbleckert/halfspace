import { describe, expect, it } from 'vitest'
import { packViewWidgets, type PackingWidget } from './view-packing'

describe('View packing', () => {
  it('keeps the lead wide and leaves room for the next wide card beside a tall list', () => {
    const widgets: PackingWidget[] = [
      { span: 2, height: 250 },
      { span: 1, height: 500 },
      { span: 1, height: 450 },
      { span: 2, height: 350 }
    ]
    const result = packViewWidgets(widgets, 3, 24)
    expect(result.positions).toEqual([
      { column: 0, top: 0 },
      { column: 2, top: 0 },
      { column: 2, top: 524 },
      { column: 0, top: 274 }
    ])
    expect(result.height).toBe(974)
    expect(widgets.map((widget) => widget.span)).toEqual([2, 1, 1, 2])
  })

  it('uses the same wide-card arrangement while the cards still show equal-height placeholders', () => {
    const result = packViewWidgets(
      [2, 1, 1, 2].map((span) => ({ span, height: 240 })),
      3,
      24
    )
    expect(result.positions.map((position) => position.column)).toEqual([0, 2, 2, 0])
  })

  it('keeps existing columns when content loads or a card expands', () => {
    const widgets = [2, 1, 1, 2].map((span) => ({ span, height: 240 }))
    const initial = packViewWidgets(widgets, 3, 24)
    widgets[0].height = 380
    widgets[2].height = 600
    const updated = packViewWidgets(
      widgets,
      3,
      24,
      initial.positions.map((item) => item.column)
    )
    expect(updated.positions.map((item) => item.column)).toEqual([0, 2, 2, 0])
    expect(updated.positions[3].top).toBe(404)
    expect(updated.height).toBe(864)
  })

  it('treats full-width cards as section boundaries', () => {
    const result = packViewWidgets(
      [
        { span: 1, height: 400 },
        { span: 1, height: 200 },
        { span: 3, height: 100 },
        { span: 1, height: 80 }
      ],
      3,
      24
    )
    expect(result.positions[2]).toEqual({ column: 0, top: 424 })
    expect(result.positions[3].top).toBe(548)
    expect(result.height).toBe(628)
  })

  it('clamps spans to the available columns without changing the saved preferences', () => {
    const widgets = [2, 1, 3, 1].map((span) => ({ span, height: 100 }))
    expect(packViewWidgets(widgets, 1, 24).positions).toEqual([
      { column: 0, top: 0 },
      { column: 0, top: 124 },
      { column: 0, top: 248 },
      { column: 0, top: 372 }
    ])
    expect(packViewWidgets(widgets, 2, 24).positions[2]).toEqual({ column: 0, top: 248 })
    expect(widgets.map((widget) => widget.span)).toEqual([2, 1, 3, 1])
  })

  it('packs varied large canvases deterministically, within bounds and without overlaps', () => {
    for (const columns of [1, 2, 3]) {
      const widgets = Array.from({ length: 120 }, (_, index) => ({
        span: ((index * 7) % 3) + 1,
        height: ((index * 113) % 470) + 80.5
      }))
      const result = packViewWidgets(widgets, columns, 24)
      expect(packViewWidgets(widgets, columns, 24)).toEqual(result)
      result.positions.forEach((position, index) => {
        const span = Math.min(columns, widgets[index].span)
        expect(position.column).toBeGreaterThanOrEqual(0)
        expect(position.column + span).toBeLessThanOrEqual(columns)
        expect(position.top + widgets[index].height).toBeLessThanOrEqual(result.height)
        for (let previous = 0; previous < index; previous++) {
          const other = result.positions[previous]
          const otherSpan = Math.min(columns, widgets[previous].span)
          const separateColumns =
            position.column >= other.column + otherSpan || other.column >= position.column + span
          const separateRows =
            position.top >= other.top + widgets[previous].height + 24 ||
            other.top >= position.top + widgets[index].height + 24
          expect(separateColumns || separateRows).toBe(true)
        }
      })
    }
  })

  it('handles an empty canvas without a trailing gap', () => {
    expect(packViewWidgets([], 3, 24)).toEqual({ positions: [], height: 0 })
  })
})
