import type {
  SportmonksEvent,
  SportmonksFixtureStatistic,
  SportmonksLineup,
  SportmonksOdd
} from '@shared/contracts'

export interface StatisticRow {
  id: number
  label: string
  home: number | string | null
  away: number | string | null
  group: string | null
}

export interface StatisticShare {
  home: number
  away: number
}

export interface OddsGroup {
  key: string
  market: string
  bookmaker: string
  odds: SportmonksOdd[]
}

export interface FormationLine {
  row: number
  entries: SportmonksLineup[]
}

export type PlayerEventAnnotationKind =
  | 'goal'
  | 'assist'
  | 'yellow-card'
  | 'red-card'
  | 'substitution-on'
  | 'substitution-off'
  | 'missed-penalty'

export interface PlayerEventAnnotation {
  eventId: number
  kind: PlayerEventAnnotationKind
  label: string
  minute: number
  extraMinute: number | null
}

export function sortedFixtureEvents(events: SportmonksEvent[]): SportmonksEvent[] {
  return events.toSorted(
    (left, right) =>
      (left.sort_order !== null &&
      left.sort_order !== undefined &&
      right.sort_order !== null &&
      right.sort_order !== undefined
        ? left.sort_order - right.sort_order
        : 0) ||
      left.minute - right.minute ||
      (left.extra_minute ?? 0) - (right.extra_minute ?? 0) ||
      left.id - right.id
  )
}

export function fixturePlayerAnnotations(
  events: SportmonksEvent[]
): Map<number, PlayerEventAnnotation[]> {
  const annotations = new Map<number, PlayerEventAnnotation[]>()

  for (const event of sortedFixtureEvents(events)) {
    if (event.rescinded) continue

    switch (event.type_id) {
      case 14:
        addPlayerAnnotation(annotations, event.player_id, event, 'goal', 'Goal')
        addPlayerAnnotation(annotations, event.related_player_id, event, 'assist', 'Assist')
        break
      case 15:
        addPlayerAnnotation(annotations, event.player_id, event, 'goal', 'Own goal')
        break
      case 16:
        addPlayerAnnotation(annotations, event.player_id, event, 'goal', 'Penalty goal')
        break
      case 17:
      case 22:
        addPlayerAnnotation(annotations, event.player_id, event, 'missed-penalty', 'Missed penalty')
        break
      case 18:
        addPlayerAnnotation(
          annotations,
          event.player_id,
          event,
          'substitution-on',
          'Substituted on'
        )
        addPlayerAnnotation(
          annotations,
          event.related_player_id,
          event,
          'substitution-off',
          'Substituted off'
        )
        break
      case 19:
        addPlayerAnnotation(annotations, event.player_id, event, 'yellow-card', 'Yellow card')
        break
      case 20:
        addPlayerAnnotation(annotations, event.player_id, event, 'red-card', 'Red card')
        break
      case 21:
        addPlayerAnnotation(annotations, event.player_id, event, 'red-card', 'Second yellow card')
        break
      case 23:
        addPlayerAnnotation(annotations, event.player_id, event, 'goal', 'Shootout goal')
        break
    }
  }

  return annotations
}

function addPlayerAnnotation(
  annotations: Map<number, PlayerEventAnnotation[]>,
  playerId: number | null | undefined,
  event: SportmonksEvent,
  kind: PlayerEventAnnotationKind,
  label: string
): void {
  if (!playerId) return

  const playerAnnotations = annotations.get(playerId) ?? []
  playerAnnotations.push({
    eventId: event.id,
    kind,
    label,
    minute: event.minute,
    extraMinute: event.extra_minute ?? null
  })
  annotations.set(playerId, playerAnnotations)
}

export function fixtureFormationLines(lineups: SportmonksLineup[]): FormationLine[] | null {
  const starters = lineups.filter(({ type_id }) => type_id === 11)
  if (starters.length !== 11) return null

  const rows = new Map<number, Array<{ entry: SportmonksLineup; slot: number }>>()

  for (const entry of starters) {
    const coordinate = parseFormationField(entry.formation_field)
    if (!coordinate) return null

    const row = rows.get(coordinate.row) ?? []
    row.push({ entry, slot: coordinate.slot })
    rows.set(coordinate.row, row)
  }

  return [...rows.entries()]
    .toSorted(([left], [right]) => left - right)
    .map(([row, entries]) => ({
      row,
      entries: entries.toSorted((left, right) => left.slot - right.slot).map(({ entry }) => entry)
    }))
}

export function fixtureFormationLabel(lines: FormationLine[]): string {
  return lines
    .filter(({ row }) => row !== lines[0]?.row)
    .map(({ entries }) => entries.length)
    .join('-')
}

function parseFormationField(value: string | null | undefined): {
  row: number
  slot: number
} | null {
  const match = value?.match(/^([1-9]\d*):([1-9]\d*)$/)
  if (!match) return null

  return { row: Number(match[1]), slot: Number(match[2]) }
}

export function fixtureStatisticRows(statistics: SportmonksFixtureStatistic[]): StatisticRow[] {
  const rows = new Map<number, StatisticRow>()

  for (const statistic of statistics) {
    const row = rows.get(statistic.type_id) ?? {
      id: statistic.type_id,
      label: statistic.type?.name ?? `Statistic ${statistic.type_id}`,
      home: null,
      away: null,
      group: statistic.type?.stat_group ?? null
    }
    row[statistic.location] = statistic.data.value ?? null
    rows.set(statistic.type_id, row)
  }

  return [...rows.values()].toSorted((left, right) => left.label.localeCompare(right.label))
}

export function fixtureStatisticShare(
  homeValue: number | string | null,
  awayValue: number | string | null
): StatisticShare | null {
  const home = statisticNumber(homeValue)
  const away = statisticNumber(awayValue)

  if (home === null || away === null || home < 0 || away < 0 || home + away === 0) return null

  const homeShare = (home / (home + away)) * 100

  return { home: homeShare, away: 100 - homeShare }
}

function statisticNumber(value: number | string | null): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (value === null) return null

  const normalized = value.trim().replace(/%$/, '')
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return null

  const number = Number(normalized)
  return Number.isFinite(number) ? number : null
}

export function fixtureOddsGroups(odds: SportmonksOdd[]): OddsGroup[] {
  const groups = new Map<string, OddsGroup>()

  for (const odd of odds) {
    const key = `${odd.market_id}|${odd.bookmaker_id}`
    const group = groups.get(key) ?? {
      key,
      market: odd.market?.name ?? odd.market_description ?? `Market ${odd.market_id}`,
      bookmaker: odd.bookmaker?.name ?? `Bookmaker ${odd.bookmaker_id}`,
      odds: []
    }
    group.odds.push(odd)
    groups.set(key, group)
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      odds: group.odds.toSorted((left, right) => left.label.localeCompare(right.label))
    }))
    .toSorted(
      (left, right) =>
        left.market.localeCompare(right.market) || left.bookmaker.localeCompare(right.bookmaker)
    )
}
