import type { RefreshTeamFixturesInput } from '@shared/contracts'
import type { CachedFixture, CachedStanding } from '@/data/db'
import { addDaysToIsoDate, isoDateInTimeZone } from '@/lib/date'

export type FixtureOutcome = 'W' | 'D' | 'L'

const finishedFixtureStates = new Set([5, 7, 8])

export function fixturePreviewTeamInput(
  teamId: number,
  startingAt: number,
  timeZone: string
): RefreshTeamFixturesInput {
  const fixtureDate = isoDateInTimeZone(startingAt, timeZone)
  const endDate = addDaysToIsoDate(fixtureDate, -1)

  return {
    teamId,
    startDate: addDaysToIsoDate(endDate, -99),
    endDate,
    timeZone
  }
}

export function recentTeamFixtures(
  fixtures: CachedFixture[],
  teamId: number,
  currentFixtureId: number,
  startingAt: number
): CachedFixture[] {
  return recentFinishedFixtures(fixtures, currentFixtureId, startingAt)
    .filter(({ homeTeamId, awayTeamId }) => homeTeamId === teamId || awayTeamId === teamId)
    .slice(0, 5)
}

export function recentHeadToHead(
  fixtures: CachedFixture[],
  currentFixtureId: number,
  startingAt: number
): CachedFixture[] {
  return recentFinishedFixtures(fixtures, currentFixtureId, startingAt).slice(0, 5)
}

export function fixtureOutcome(fixture: CachedFixture, teamId: number): FixtureOutcome | null {
  const participant = fixture.raw.participants.find(({ id }) => id === teamId)
  const decidedWinner = fixture.raw.participants.find(({ meta }) => meta?.winner === true)

  if (decidedWinner) return decidedWinner.id === teamId ? 'W' : 'L'

  const teamLocation = participant?.meta?.location
  if (!teamLocation) return null

  const scores = fixture.raw.scores.filter(({ description }) => description === 'CURRENT')
  const teamScore = scores.find(({ score }) => score.participant === teamLocation)?.score.goals
  const opponentScore = scores.find(({ score }) => score.participant !== teamLocation)?.score.goals

  if (teamScore === undefined || opponentScore === undefined) return null
  if (teamScore === opponentScore) return 'D'
  return teamScore > opponentScore ? 'W' : 'L'
}

export function standingForParticipant(
  standings: CachedStanding[],
  participantId: number
): CachedStanding | null {
  const participantStandings = standings.filter(
    (standing) => standing.participantId === participantId
  )

  return (
    participantStandings.find(({ raw }) => raw.result?.toLocaleLowerCase() === 'overall') ??
    participantStandings[0] ??
    null
  )
}

function recentFinishedFixtures(
  fixtures: CachedFixture[],
  currentFixtureId: number,
  startingAt: number
): CachedFixture[] {
  return fixtures
    .filter(
      (fixture) =>
        fixture.id !== currentFixtureId &&
        fixture.startingAt !== null &&
        fixture.startingAt < startingAt &&
        finishedFixtureStates.has(fixture.stateId)
    )
    .toSorted((left, right) => (right.startingAt ?? 0) - (left.startingAt ?? 0))
}
