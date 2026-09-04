import { useState } from 'react'
import type { SportmonksParticipant } from '@shared/contracts'
import { matchTrendMetrics } from '@shared/match-trends'
import type { FixtureTrendsQuery } from '@/data/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'
import { fixtureTrendPeriods, type TrendReading } from './trend-data'

export function FixtureTrends({
  cached,
  home,
  away
}: {
  cached: FixtureTrendsQuery | null | undefined
  home?: SportmonksParticipant
  away?: SportmonksParticipant
}): React.JSX.Element | null {
  const [metricId, setMetricId] = useState<number>(45)
  const [periodId, setPeriodId] = useState<string | null>(null)
  const metrics = matchTrendMetrics.filter((metric) =>
    cached?.points.some(
      (point) =>
        point.type_id === metric.id &&
        point.value !== null &&
        (point.participant_id === home?.id || point.participant_id === away?.id)
    )
  )
  const metric = metrics.find((metric) => metric.id === metricId) ?? metrics[0]
  const periods = fixtureTrendPeriods(
    cached?.points ?? [],
    cached?.periods ?? [],
    metric?.id ?? 45,
    home?.id,
    away?.id
  )
  const period = periods.find((period) => String(period.id) === periodId) ?? periods.at(-1)
  if (!metric || !period) return null

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>Match trends</CardTitle>
        <div className="flex flex-wrap gap-2">
          <NativeSelect
            aria-label="Trend statistic"
            value={metric.id}
            onChange={(event) => setMetricId(Number(event.target.value))}
          >
            {metrics.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Trend period"
            value={String(period.id)}
            onChange={(event) => setPeriodId(event.target.value)}
          >
            {periods.map((period) => (
              <option key={String(period.id)} value={String(period.id)}>
                {period.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </CardHeader>
      <CardContent>
        <TrendChart
          key={`${cached?.fixtureId}:${metric.id}:${period.id}`}
          readings={period.readings}
          name={metric.name}
          period={period.name}
          percentage={metric.percentage}
          home={home?.name ?? 'Home'}
          away={away?.name ?? 'Away'}
        />
      </CardContent>
    </Card>
  )
}

function TrendChart({
  readings,
  name,
  period,
  percentage,
  home,
  away
}: {
  readings: TrendReading[]
  name: string
  period: string
  percentage: boolean
  home: string
  away: string
}): React.JSX.Element {
  const [inspection, setInspection] = useState<number | null>(null)
  const selectedIndex = Math.min(inspection ?? readings.length - 1, readings.length - 1)
  const selected = readings[selectedIndex]
  const start = readings[0].minute
  const end = Math.max(start + 1, readings.at(-1)!.minute)
  const maximum = percentage
    ? 100
    : Math.max(1, ...readings.flatMap((row) => [row.home ?? 0, row.away ?? 0]))
  const x = (minute: number): number => 40 + ((minute - start) / (end - start)) * 640
  const y = (value: number): number => 174 - (value / maximum) * 154
  const valueText = (value: number | null): string =>
    value === null ? '–' : `${value}${percentage ? '%' : ''}`
  const selectedText = `${period}, ${selected.minute} minutes: ${home} ${selected.home === null ? 'not reported' : valueText(selected.home)}, ${away} ${selected.away === null ? 'not reported' : valueText(selected.away)}`

  function inspectPointer(event: React.PointerEvent<HTMLDivElement>): void {
    const bounds = event.currentTarget.getBoundingClientRect()
    const minute =
      start + ((((event.clientX - bounds.left) / bounds.width) * 720 - 40) / 640) * (end - start)
    let nearest = 0
    readings.forEach((reading, index) => {
      if (Math.abs(reading.minute - minute) < Math.abs(readings[nearest].minute - minute))
        nearest = index
    })
    setInspection(nearest)
  }

  return (
    <figure>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {[
          { side: 'home', team: home, value: selected.home },
          { side: 'away', team: away, value: selected.away }
        ].map(({ side, team, value }) => (
          <div key={side} className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className={cn('size-2 rounded-sm', side === 'home' ? 'bg-chart-1' : 'bg-chart-5')}
            />
            <span className="truncate font-medium">{team}</span>
            <span className="font-mono tabular-nums">{valueText(value)}</span>
          </div>
        ))}
        <span className="font-mono tabular-nums text-muted-foreground">{selected.minute}′</span>
      </div>
      <div
        role="slider"
        aria-label={`${name} by minute`}
        aria-valuemin={0}
        aria-valuemax={readings.length - 1}
        aria-valuenow={selectedIndex}
        aria-valuetext={selectedText}
        tabIndex={0}
        className="mt-2 cursor-crosshair rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onPointerMove={inspectPointer}
        onPointerDown={(event) => {
          event.currentTarget.focus()
          inspectPointer(event)
        }}
        onPointerLeave={() => setInspection(null)}
        onKeyDown={(event) => {
          if (
            !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)
          )
            return
          event.preventDefault()
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? readings.length - 1
                : selectedIndex + (['ArrowLeft', 'ArrowDown'].includes(event.key) ? -1 : 1)
          setInspection(Math.max(0, Math.min(readings.length - 1, next)))
        }}
      >
        <svg viewBox="0 0 720 200" className="block w-full" aria-hidden>
          {[0, maximum / 2, maximum].map((tick) => (
            <g key={tick}>
              <line
                x1="40"
                x2="680"
                y1={y(tick)}
                y2={y(tick)}
                className="stroke-border"
                strokeWidth="1"
              />
              <text
                x="32"
                y={y(tick) + 4}
                textAnchor="end"
                className="fill-muted-foreground font-mono text-[10px]"
              >
                {Number(tick.toFixed(1))}
                {percentage ? '%' : ''}
              </text>
            </g>
          ))}
          <line
            x1={x(selected.minute)}
            x2={x(selected.minute)}
            y1="16"
            y2="174"
            className="stroke-muted-foreground/50"
            strokeDasharray="3 3"
          />
          {(['home', 'away'] as const).map((side) => (
            <g key={side} className={side === 'home' ? 'text-chart-1' : 'text-chart-5'}>
              {readings.map((reading, index) => {
                const value = reading[side]
                if (value === null) return null
                const previous = readings[index - 1]
                return (
                  <g key={reading.minute}>
                    {previous?.[side] != null && reading.minute - previous.minute === 1 && (
                      <line
                        x1={x(previous.minute)}
                        y1={y(previous[side])}
                        x2={x(reading.minute)}
                        y2={y(value)}
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    )}
                    <circle
                      cx={x(reading.minute)}
                      cy={y(value)}
                      r={reading.minute === selected.minute ? 4 : 2.5}
                      fill="currentColor"
                    />
                  </g>
                )
              })}
            </g>
          ))}
          {[start, Math.round((start + end) / 2), end]
            .filter((minute, index, values) => values.indexOf(minute) === index)
            .map((minute) => (
              <text
                key={minute}
                x={x(minute)}
                y="195"
                textAnchor="middle"
                className="fill-muted-foreground font-mono text-[10px]"
              >
                {minute}′
              </text>
            ))}
        </svg>
      </div>
      <figcaption className="mt-2 text-xs text-muted-foreground">
        {percentage ? 'Reported possession percentages.' : 'Reported match totals at each reading.'}{' '}
        Missing readings are left blank.
      </figcaption>
    </figure>
  )
}
