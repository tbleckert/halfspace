import type { SportmonksEvent, SportmonksPressure } from '@shared/contracts'
import { sortedFixtureEvents } from './fixture-detail-data'

export interface PressureReading {
  minute: number
  home: number | null
  away: number | null
}

export interface PressureMarker {
  id: number
  minute: number
  side: 'home' | 'away'
  kind: 'goal' | 'red-card'
  label: string
}

const eventLabels = new Map([
  [14, 'Goal'],
  [15, 'Own goal'],
  [16, 'Penalty goal'],
  [20, 'Red card'],
  [21, 'Second yellow']
])

export function pressureChartData(
  points: SportmonksPressure[],
  events: SportmonksEvent[],
  homeId?: number,
  awayId?: number
): { readings: PressureReading[]; markers: PressureMarker[]; maximum: number; endMinute: number } {
  const byMinute = new Map<number, PressureReading>()
  for (const point of points.toSorted((left, right) => left.id - right.id)) {
    if (point.participant_id !== homeId && point.participant_id !== awayId) continue
    const reading = byMinute.get(point.minute) ?? { minute: point.minute, home: null, away: null }
    reading[point.participant_id === homeId ? 'home' : 'away'] = point.pressure
    byMinute.set(point.minute, reading)
  }
  const readings = [...byMinute.values()].sort((left, right) => left.minute - right.minute)
  const markers: PressureMarker[] = sortedFixtureEvents(events).flatMap((event) => {
    const label = eventLabels.get(event.type_id)
    if (
      !label ||
      event.rescinded ||
      (event.participant_id !== homeId && event.participant_id !== awayId)
    )
      return []
    const minute = event.extra_minute
      ? `${event.minute}+${event.extra_minute}′`
      : `${event.minute}′`
    return [
      {
        id: event.id,
        minute: event.minute + (event.extra_minute ?? 0),
        side: event.participant_id === homeId ? 'home' : 'away',
        kind: event.type_id === 20 || event.type_id === 21 ? 'red-card' : 'goal',
        label: [minute, label, event.player?.display_name ?? event.player_name]
          .filter(Boolean)
          .join(' · ')
      }
    ]
  })
  const peak = Math.max(0, ...readings.flatMap((reading) => [reading.home ?? 0, reading.away ?? 0]))
  return {
    readings,
    markers,
    maximum: Math.max(25, Math.ceil(peak / 25) * 25),
    endMinute: Math.max(
      1,
      ...readings.map((reading) => reading.minute),
      ...markers.map((marker) => marker.minute)
    )
  }
}
