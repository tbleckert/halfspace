import { useId, useMemo, useState } from 'react'
import { FootballIcon } from '@/components/football-icon'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { FixturePressureQuery } from '@/data/db'
import { TeamLogo } from '@/features/teams/team-logo'
import { cn } from '@/lib/utils'
import type { SportmonksEvent, SportmonksParticipant } from '@shared/contracts'
import { pressureChartData, type PressureMarker } from './pressure-data'

export function FixturePressure({
  cached,
  events,
  home,
  away,
  online
}: {
  cached: FixturePressureQuery | null | undefined
  events: SportmonksEvent[]
  home?: SportmonksParticipant
  away?: SportmonksParticipant
  online: boolean
}): React.JSX.Element | null {
  const chart = useMemo(
    () => pressureChartData(cached?.points ?? [], events, home?.id, away?.id),
    [cached?.points, events, home?.id, away?.id]
  )

  if (chart.readings.length === 0) return null

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Pressure</CardTitle>
      </CardHeader>
      <CardContent>
        <PressureChart chart={chart} home={home} away={away} online={online} />
      </CardContent>
    </Card>
  )
}

function PressureChart({
  chart,
  home,
  away,
  online
}: {
  chart: ReturnType<typeof pressureChartData>
  home?: SportmonksParticipant
  away?: SportmonksParticipant
  online: boolean
}): React.JSX.Element {
  const [minute, setMinute] = useState(chart.readings[0].minute)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const descriptionId = useId()
  const activeMinute = Math.min(minute, chart.endMinute)
  const selected = chart.readings.find((reading) => reading.minute === activeMinute)
  const selectedEvents = chart.markers.filter((marker) => marker.minute === activeMinute)
  const homeName = home?.name ?? 'Home'
  const awayName = away?.name ?? 'Away'
  const tickStep = chart.endMinute > 45 ? 15 : chart.endMinute > 10 ? 5 : 1
  const ticks = Array.from(
    { length: Math.ceil(chart.endMinute / tickStep) },
    (_, index) => index * tickStep
  ).filter((tick) => tick === 0 || chart.endMinute - tick >= tickStep / 2)
  ticks.push(chart.endMinute)
  const x = (value: number): number => ((value + 0.5) / (chart.endMinute + 1)) * 100
  const barWidth = (900 / (chart.endMinute + 1)) * 0.8
  const selectedText = `${activeMinute} minutes: ${homeName} ${selected?.home ?? 'not reported'}, ${awayName} ${selected?.away ?? 'not reported'}`
  const markerGroups = new Map<string, PressureMarker[]>()
  for (const marker of chart.markers) {
    const key = `${marker.side}:${marker.minute}`
    const group = markerGroups.get(key) ?? []
    group.push(marker)
    markerGroups.set(key, group)
  }

  function inspectMinute(value: number): void {
    setMinute(value)
    setTooltipVisible(true)
  }

  function inspectPointer(event: React.PointerEvent<HTMLDivElement>): void {
    const bounds = event.currentTarget.getBoundingClientRect()
    const value = Math.round(
      ((event.clientX - bounds.left) / bounds.width) * (chart.endMinute + 1) - 0.5
    )
    inspectMinute(Math.max(0, Math.min(chart.endMinute, value)))
  }

  return (
    <figure>
      <div className="mb-2 flex items-center justify-between gap-4 text-xs font-medium">
        {[
          { team: home, name: homeName, side: 'home' },
          { team: away, name: awayName, side: 'away' }
        ].map(({ team, name, side }) => (
          <div key={side} className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                'size-2 shrink-0 rounded-sm',
                side === 'home' ? 'bg-chart-1' : 'bg-chart-5'
              )}
            />
            <TeamLogo className="size-5" imagePath={team?.image_path ?? null} online={online} />
            <span className="truncate">{name}</span>
            <span aria-hidden="true" className="text-muted-foreground">
              {side === 'home' ? '↑' : '↓'}
            </span>
          </div>
        ))}
      </div>
      <p id={descriptionId} className="sr-only">
        Sportmonks Pressure Index, not a percentage. {homeName} above the center line, {awayName}{' '}
        below. Both use the same scale from zero to {chart.maximum}. Use left and right arrows to
        inspect reported minutes. Missing readings are not shown. Event markers retain their
        reported match minutes, including added time.
      </p>
      <div className="relative pl-8 pr-3">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-7 h-[200px] font-mono text-[10px] tabular-nums text-muted-foreground"
        >
          <span className="absolute top-0 -translate-y-1/2">{chart.maximum}</span>
          <span className="absolute top-1/2 -translate-y-1/2">0</span>
          <span className="absolute top-full -translate-y-1/2">{chart.maximum}</span>
        </div>
        <div className="relative">
          <div
            role="slider"
            aria-label="Pressure by minute"
            aria-describedby={descriptionId}
            aria-valuemin={0}
            aria-valuemax={chart.endMinute}
            aria-valuenow={activeMinute}
            aria-valuetext={selectedText}
            tabIndex={0}
            className="relative h-64 cursor-crosshair rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onPointerMove={inspectPointer}
            onPointerDown={(event) => {
              event.currentTarget.focus()
              inspectPointer(event)
            }}
            onPointerLeave={() => setTooltipVisible(false)}
            onFocus={() => setTooltipVisible(true)}
            onBlur={() => setTooltipVisible(false)}
            onKeyDown={(event) => {
              if (
                ![
                  'ArrowLeft',
                  'ArrowRight',
                  'ArrowUp',
                  'ArrowDown',
                  'Home',
                  'End',
                  'Escape'
                ].includes(event.key)
              )
                return
              event.preventDefault()
              if (event.key === 'Escape') setTooltipVisible(false)
              else if (event.key === 'Home') inspectMinute(0)
              else if (event.key === 'End') inspectMinute(chart.endMinute)
              else
                inspectMinute(
                  Math.max(
                    0,
                    Math.min(
                      chart.endMinute,
                      activeMinute +
                        (event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1)
                    )
                  )
                )
            }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 900 200"
              preserveAspectRatio="none"
              className="absolute inset-x-0 top-7 h-[200px] w-full overflow-visible"
            >
              {[0, 50, 150, 200].map((y) => (
                <line
                  key={y}
                  x1="0"
                  x2="900"
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="2 4"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <line
                x1="0"
                x2="900"
                y1="100"
                y2="100"
                stroke="var(--muted-foreground)"
                strokeOpacity="0.5"
                vectorEffect="non-scaling-stroke"
              />
              {chart.readings.flatMap((reading) =>
                (['home', 'away'] as const).map((side) => {
                  const value = reading[side]
                  if (value === null) return null
                  const height = (value / chart.maximum) * 100
                  return (
                    <rect
                      key={`${reading.minute}:${side}`}
                      x={x(reading.minute) * 9 - barWidth / 2}
                      y={side === 'home' ? 100 - height : 100}
                      width={barWidth}
                      height={height}
                      fill={`var(--chart-${side === 'home' ? 1 : 5})`}
                    />
                  )
                })
              )}
              {tooltipVisible && (
                <line
                  x1={x(activeMinute) * 9}
                  x2={x(activeMinute) * 9}
                  y1="0"
                  y2="200"
                  stroke="var(--foreground)"
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
          </div>
          {[...markerGroups.values()].map((group) => {
            const marker = group[0]
            return (
              <button
                key={marker.id}
                type="button"
                aria-label={group.map((event) => event.label).join('; ')}
                className={cn(
                  'absolute flex -translate-x-1/2 items-center gap-0.5 rounded-sm bg-card p-1 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                  marker.side === 'home' ? 'top-0' : 'top-[232px]'
                )}
                style={{ left: `${x(marker.minute)}%` }}
                onPointerEnter={() => inspectMinute(marker.minute)}
                onPointerLeave={() => setTooltipVisible(false)}
                onFocus={() => inspectMinute(marker.minute)}
                onBlur={() => setTooltipVisible(false)}
                onClick={() => inspectMinute(marker.minute)}
              >
                {group.some((event) => event.kind === 'goal') && (
                  <FootballIcon className="size-4" />
                )}
                {group.some((event) => event.kind === 'red-card') && (
                  <span
                    aria-hidden="true"
                    className="mx-0.5 block h-4 w-3 rounded-[2px] bg-destructive"
                  />
                )}
                {group.length > 1 && (
                  <span aria-hidden="true" className="font-mono text-[10px] tabular-nums">
                    {group.length}
                  </span>
                )}
              </button>
            )
          })}
          {tooltipVisible && (
            <div
              role="tooltip"
              className="pointer-events-none absolute top-8 z-10 w-52 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-md"
              style={{
                left: `${x(activeMinute)}%`,
                transform:
                  x(activeMinute) > 50 ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)'
              }}
            >
              <p className="mb-2 font-mono font-semibold tabular-nums">{activeMinute}′</p>
              {[
                { name: homeName, value: selected?.home, side: 'home' },
                { name: awayName, value: selected?.away, side: 'away' }
              ].map(({ name, value, side }) => (
                <div key={side} className="flex items-center justify-between gap-3 py-0.5">
                  <span className="truncate">{name}</span>
                  <span className="font-mono tabular-nums">{value ?? '–'}</span>
                </div>
              ))}
              {selectedEvents.length > 0 && (
                <ul className="mt-2 space-y-1 border-t pt-2">
                  {selectedEvents.map((marker) => (
                    <li key={marker.id}>{marker.label}</li>
                  ))}
                </ul>
              )}
              {(selected?.home == null || selected?.away == null) && (
                <p className="mt-2 text-muted-foreground">– Not reported</p>
              )}
            </div>
          )}
          <div
            aria-hidden="true"
            className="relative mt-1 h-4 font-mono text-[10px] tabular-nums text-muted-foreground"
          >
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute -translate-x-1/2"
                style={{ left: `${x(tick)}%` }}
              >
                {tick}′
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  )
}
