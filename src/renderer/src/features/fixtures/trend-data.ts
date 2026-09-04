import type { SportmonksPeriod, SportmonksTrend } from '@shared/contracts'

export interface TrendReading {
  minute: number
  home: number | null
  away: number | null
}

export function fixtureTrendPeriods(
  points: SportmonksTrend[],
  periods: SportmonksPeriod[],
  metricId: number,
  homeId?: number,
  awayId?: number
): { id: number | null; name: string; readings: TrendReading[] }[] {
  const groups = new Map<number | null, Map<number, TrendReading>>()
  for (const point of [...points].sort((a, b) => a.id - b.id)) {
    if (
      point.type_id !== metricId ||
      (point.participant_id !== homeId && point.participant_id !== awayId)
    )
      continue
    const readings = groups.get(point.period_id) ?? new Map<number, TrendReading>()
    const reading = readings.get(point.minute) ?? { minute: point.minute, home: null, away: null }
    reading[point.participant_id === homeId ? 'home' : 'away'] = point.value
    readings.set(point.minute, reading)
    groups.set(point.period_id, readings)
  }
  return [...groups]
    .sort(([left], [right]) => {
      const a = periods.find((period) => period.id === left)
      const b = periods.find((period) => period.id === right)
      return (
        (a?.sort_order ?? Infinity) - (b?.sort_order ?? Infinity) ||
        (left ?? Infinity) - (right ?? Infinity)
      )
    })
    .map(([id, readings]) => ({
      id,
      name:
        periods.find((period) => period.id === id)?.description ??
        (id === null ? 'Period not reported' : `Period ${id}`),
      readings: [...readings.values()].sort((a, b) => a.minute - b.minute)
    }))
}
