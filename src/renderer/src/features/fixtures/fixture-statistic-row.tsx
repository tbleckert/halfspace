import { cn } from '@/lib/utils'
import { fixtureStatisticShare, type StatisticRow } from './fixture-detail-data'

export function FixtureStatisticRow({
  row,
  percentage = false,
  className
}: {
  row: StatisticRow
  percentage?: boolean
  className?: string
}): React.JSX.Element {
  const share = fixtureStatisticShare(row.home, row.away)

  function formatValue(value: number | string | null): string {
    if (value === null) return '–'
    const text = String(value)
    return percentage && !text.endsWith('%') ? `${text}%` : text
  }

  return (
    <div className={cn('px-4 py-4 text-sm', className)}>
      <div className="grid grid-cols-[1fr_minmax(0,2fr)_1fr] items-center gap-2">
        <span className="font-mono font-semibold tabular-nums">{formatValue(row.home)}</span>
        <span className="text-center text-muted-foreground">{row.label}</span>
        <span className="text-right font-mono font-semibold tabular-nums">
          {formatValue(row.away)}
        </span>
      </div>
      <div aria-hidden="true" className="mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-muted">
        {share && (
          <>
            <span className="bg-chart-1" style={{ width: `${share.home}%` }} />
            <span className="bg-chart-5" style={{ width: `${share.away}%` }} />
          </>
        )}
      </div>
    </div>
  )
}
