export interface PackingWidget {
  span: number
  height: number
}

interface Position {
  column: number
  top: number
}

interface Placement {
  position: Position
  bottoms: number[]
  wastedSpace: number
}

function earliestPlacement(candidates: Placement[]): Placement {
  // Candidates are already ordered left to right, including equal-height ties.
  return candidates.reduce((earliest, candidate) =>
    candidate.position.top < earliest.position.top ? candidate : earliest
  )
}

function placements(bottoms: number[], widget: PackingWidget, gap: number): Placement[] {
  const span = Math.min(widget.span, bottoms.length)
  return Array.from({ length: bottoms.length - span + 1 }, (_, column) => {
    const occupied = bottoms.slice(column, column + span)
    const top = Math.max(...occupied)
    return {
      position: { column, top },
      bottoms: bottoms.map((bottom, index) =>
        index >= column && index < column + span ? top + Math.ceil(widget.height) + gap : bottom
      ),
      wastedSpace: occupied.reduce((total, bottom) => total + top - bottom, 0)
    }
  })
}

// Column assignments can be reused as data arrives. Only vertical positions then
// change, so refreshing one card does not reshuffle the surrounding dashboard.
export function packViewWidgets(
  widgets: PackingWidget[],
  columns: number,
  gap: number,
  assignedColumns?: number[]
): { positions: Position[]; height: number } {
  let bottoms = Array<number>(columns).fill(0)
  const positions = widgets.map((widget, index) => {
    const candidates = placements(bottoms, widget, gap)
    const next = widgets[index + 1]
    let chosen = assignedColumns
      ? candidates[assignedColumns[index]]
      : earliestPlacement(candidates)

    // Keep the lead in place. For a narrow card followed by a wider one, look one
    // card ahead so the narrow card does not block a useful contiguous space.
    if (!assignedColumns && index > 0 && next && Math.min(next.span, columns) > widget.span) {
      const options = candidates.map((candidate) => {
        const following = earliestPlacement(placements(candidate.bottoms, next, gap))
        return {
          candidate,
          wastedSpace: candidate.wastedSpace + following.wastedSpace,
          height: Math.max(...following.bottoms),
          nextColumn: following.position.column
        }
      })
      options.sort(
        (a, b) =>
          a.wastedSpace - b.wastedSpace ||
          a.height - b.height ||
          a.candidate.position.top - b.candidate.position.top ||
          a.nextColumn - b.nextColumn ||
          a.candidate.position.column - b.candidate.position.column
      )
      chosen = options[0].candidate
    }
    bottoms = chosen.bottoms
    return chosen.position
  })
  return { positions, height: Math.max(0, ...bottoms) - (widgets.length ? gap : 0) }
}
