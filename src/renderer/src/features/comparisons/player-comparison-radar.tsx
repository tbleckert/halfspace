import { useId } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import type { PlayerStatisticsSummary } from '@/features/statistics/statistics-data'
import { playerRadarRows } from './comparison-data'

const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })

function radarPoint(index: number, count: number, radius: number): { x: number; y: number } {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2
  return { x: 240 + Math.cos(angle) * radius, y: 200 + Math.sin(angle) * radius }
}

export function PlayerComparisonRadar({
  left,
  right,
  leftName,
  rightName,
  leftContext,
  rightContext
}: {
  left: PlayerStatisticsSummary
  right: PlayerStatisticsSummary
  leftName: string
  rightName: string
  leftContext: string
  rightContext: string
}): React.JSX.Element {
  const descriptionId = useId()
  const rows = playerRadarRows(left, right)
  const polygon = (ratios: number[]): string =>
    ratios
      .map((ratio, index) => {
        const point = radarPoint(index, rows.length, ratio * 130)
        return `${point.x},${point.y}`
      })
      .join(' ')
  const selections = [
    {
      name: leftName,
      context: leftContext,
      minutes: left.minutes,
      color: 'text-brand-blue',
      dashed: false
    },
    {
      name: rightName,
      context: rightContext,
      minutes: right.minutes,
      color: 'text-amber-600',
      dashed: true
    }
  ]

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-1 border-b px-4 py-3">
        <CardTitle className="text-base">Player radar</CardTitle>
        <p id={descriptionId} className="text-xs text-muted-foreground">
          Per 90 minutes. Each axis scales to the higher value in this pair, not a league
          percentile.
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {selections.map((selection, index) => (
            <div key={index} className="flex min-w-0 items-start gap-2">
              <svg
                aria-hidden="true"
                className={`mt-1 size-5 shrink-0 ${selection.color}`}
                viewBox="0 0 20 16"
              >
                <line
                  x1="0"
                  x2="20"
                  y1="8"
                  y2="8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={selection.dashed ? '4 3' : undefined}
                />
              </svg>
              <div className="min-w-0">
                <p className="text-sm font-medium">{selection.name}</p>
                <p className="text-xs text-muted-foreground">{selection.context}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">
                    {selection.minutes === null ? '—' : number.format(selection.minutes)}
                  </span>{' '}
                  minutes
                </p>
              </div>
            </div>
          ))}
        </div>
        {rows.length >= 4 ? (
          <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <svg
              viewBox="0 0 480 400"
              role="img"
              aria-label={`Per-90 radar: ${leftName} versus ${rightName}`}
              aria-describedby={descriptionId}
              className="mx-auto w-full max-w-lg"
            >
              {[0.25, 0.5, 0.75, 1].map((ratio) => (
                <polygon
                  key={ratio}
                  points={polygon(rows.map(() => ratio))}
                  fill="none"
                  className="stroke-border"
                  strokeWidth="1"
                />
              ))}
              {rows.map((row, index) => {
                const point = radarPoint(index, rows.length, 130)
                const label = radarPoint(index, rows.length, 170)
                return (
                  <g key={row.label}>
                    <line x1="240" y1="200" x2={point.x} y2={point.y} className="stroke-border" />
                    <text
                      x={label.x}
                      y={label.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-muted-foreground text-xl sm:text-sm"
                    >
                      {row.label}
                    </text>
                  </g>
                )
              })}
              {(['leftRatio', 'rightRatio'] as const).map((side, index) => (
                <g key={side} className={selections[index].color}>
                  <polygon
                    points={polygon(rows.map((row) => row[side]))}
                    fill="currentColor"
                    fillOpacity="0.07"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeDasharray={index ? '5 4' : undefined}
                  />
                  {rows.map((row, position) => {
                    const point = radarPoint(position, rows.length, row[side] * 130)
                    return (
                      <circle
                        key={row.label}
                        cx={point.x}
                        cy={point.y}
                        r="3"
                        fill={index ? 'var(--card)' : 'currentColor'}
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    )
                  })}
                </g>
              ))}
            </svg>
            <Table aria-label="Per-90 comparison">
              <TableHeader className="sr-only">
                <TableRow>
                  <TableHead>
                    {leftName} · {leftContext}
                  </TableHead>
                  <TableHead>Statistic per 90</TableHead>
                  <TableHead>
                    {rightName} · {rightContext}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="font-mono text-sm tabular-nums text-brand-blue">
                      {number.format(row.left)}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {row.label}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums text-amber-700">
                      {number.format(row.right)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Not enough shared statistics for a radar.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Shared reported metrics only. Small samples can exaggerate differences; league strength is
          not adjusted.
        </p>
      </CardContent>
    </Card>
  )
}
