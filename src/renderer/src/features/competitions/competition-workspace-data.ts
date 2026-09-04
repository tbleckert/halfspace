import type { CachedFixture, CachedStanding, CachedTeam } from '@/data/db'
import type { SportmonksSeason } from '@shared/contracts'

export interface StandingGroup {
  key: string
  name: string
  standings: CachedStanding[]
}

export interface CompetitionTeam {
  id: number
  imagePath: string | null
  name: string
  countryName?: string | null
  points: number | null
  position: number | null
}

export function groupStandings(standings: readonly CachedStanding[]): StandingGroup[] {
  const rows = standingRows(standings)
  const groups = new Map<string, StandingGroup>()

  for (const standing of rows) {
    const groupId = standing.groupId
    const key = groupId === null ? `stage:${standing.stageId}` : `group:${groupId}`
    const name = standing.raw.group?.name ?? standing.raw.stage?.name ?? 'Table'
    const group = groups.get(key) ?? { key, name, standings: [] }
    group.standings.push(standing)
    groups.set(key, group)
  }

  return [...groups.values()].map((group) => ({
    ...group,
    standings: group.standings.toSorted((left, right) => left.position - right.position)
  }))
}

export function competitionTeams(
  standings: readonly CachedStanding[],
  fixtures: readonly CachedFixture[],
  seasonTeams?: readonly CachedTeam[]
): CompetitionTeam[] {
  const teams = new Map<number, CompetitionTeam>()

  for (const standing of standingRows(standings)) {
    const participant = standing.raw.participant
    teams.set(standing.participantId, {
      id: standing.participantId,
      imagePath: participant?.image_path ?? null,
      name: participant?.name ?? `Team ${standing.participantId}`,
      points: standing.raw.points,
      position: standing.position
    })
  }

  for (const fixture of fixtures) {
    for (const participant of fixture.raw.participants) {
      if (teams.has(participant.id)) continue

      teams.set(participant.id, {
        id: participant.id,
        imagePath: participant.image_path ?? null,
        name: participant.name,
        points: null,
        position: null
      })
    }
  }

  if (seasonTeams) {
    const seasonIds = new Set(seasonTeams.map(({ id }) => id))
    for (const id of teams.keys()) {
      if (!seasonIds.has(id)) teams.delete(id)
    }
    for (const team of seasonTeams) {
      teams.set(team.id, {
        id: team.id,
        name: team.name,
        imagePath: team.imagePath,
        countryName: team.raw.country?.name ?? null,
        position: teams.get(team.id)?.position ?? null,
        points: teams.get(team.id)?.points ?? null
      })
    }
  }

  return [...teams.values()].toSorted((left, right) => {
    if (left.position === null && right.position !== null) return 1
    if (left.position !== null && right.position === null) return -1
    if (left.position !== null && right.position !== null && left.position !== right.position) {
      return left.position - right.position
    }

    return left.name.localeCompare(right.name)
  })
}

export function nearestFixtureSeasonId(
  fixtures: readonly CachedFixture[],
  now: number
): number | null {
  const nearest = fixtures
    .filter(
      (fixture): fixture is CachedFixture & { startingAt: number } => fixture.startingAt !== null
    )
    .toSorted(
      (left, right) => Math.abs(left.startingAt - now) - Math.abs(right.startingAt - now)
    )[0]

  return nearest?.seasonId ?? null
}

export function competitionSeasonOptions(
  seasons: readonly SportmonksSeason[],
  currentSeason?: SportmonksSeason | null
): SportmonksSeason[] {
  const uniqueSeasons = new Map<number, SportmonksSeason>()

  for (const season of [...seasons, ...(currentSeason ? [currentSeason] : [])]) {
    uniqueSeasons.set(season.id, season)
  }

  return [...uniqueSeasons.values()]
    .toSorted((left, right) => {
      if (left.is_current !== right.is_current) return left.is_current ? -1 : 1

      const leftDate = left.ending_at ?? left.starting_at ?? ''
      const rightDate = right.ending_at ?? right.starting_at ?? ''
      return rightDate.localeCompare(leftDate) || right.id - left.id
    })
    .slice(0, 10)
}

export function selectedCompetitionSeason(
  seasons: readonly SportmonksSeason[],
  requestedSeasonId?: number
): SportmonksSeason | null {
  return seasons.find(({ id }) => id === requestedSeasonId) ?? seasons[0] ?? null
}

export function seasonFixtureDate(season: SportmonksSeason | null, today: string): string {
  if (!season) return today
  if (season.starting_at && today < season.starting_at) return season.starting_at
  if (season.ending_at && today > season.ending_at) return season.ending_at
  return today
}

function standingRows(standings: readonly CachedStanding[]): readonly CachedStanding[] {
  const overall = standings.filter(({ raw }) => raw.result === 'overall')
  return overall.length > 0 ? overall : standings
}
