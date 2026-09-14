import type { RefreshTeamFixturesInput, SportmonksParticipant } from '@shared/contracts'
import type { ViewBlock } from '@shared/views'
import type { CachedFixture } from '@/data/db'
import { addDaysToIsoDate, isoDateInTimeZone } from '@/lib/date'
import { fixtureOutcome, type FixtureOutcome } from '@/features/fixtures/fixture-preview-data'
import { selectTeamViewFixtures } from './team-view-data'

export type FormTrendDefinition = Extract<ViewBlock, { type: 'form-trend' }>

export interface FormTrendMatch {
  fixture: CachedFixture
  opponent: SportmonksParticipant | undefined
  location: 'home' | 'away' | null
  goalsFor: number | null
  goalsAgainst: number | null
  outcome: FixtureOutcome | null
}

export function formTrendInput(
  teamId: number,
  today: string,
  timeZone: string
): RefreshTeamFixturesInput {
  return { teamId, startDate: addDaysToIsoDate(today, -99), endDate: today, timeZone }
}

export function selectFormTrend(
  fixtures: CachedFixture[],
  input: RefreshTeamFixturesInput,
  matchLocation: FormTrendDefinition['matchLocation'],
  now: number
): FormTrendMatch[] {
  return selectTeamViewFixtures(fixtures, input.teamId, 'recent', now)
    .filter((fixture) => {
      const date = isoDateInTimeZone(fixture.startingAt!, input.timeZone)
      const location = fixture.raw.participants.find(({ id }) => id === input.teamId)?.meta
        ?.location
      return (
        date >= input.startDate &&
        date <= input.endDate &&
        (matchLocation === 'all' || location === matchLocation)
      )
    })
    .slice(0, 6)
    .reverse()
    .map((fixture) => {
      const participant = fixture.raw.participants.find(({ id }) => id === input.teamId)!
      const opponent = fixture.raw.participants.find(({ id }) => id !== input.teamId)
      // CURRENT includes extra time, but excludes penalty shootout goals.
      const scores = fixture.raw.scores.filter(({ description }) => description === 'CURRENT')
      const goalsFor =
        scores.find(({ participant_id }) => participant_id === input.teamId)?.score.goals ?? null
      const goalsAgainst =
        scores.find(({ participant_id }) => participant_id === opponent?.id)?.score.goals ?? null
      const winner = fixture.raw.participants.find(({ meta }) => meta?.winner === true)
      return {
        fixture,
        opponent,
        location: participant.meta?.location ?? null,
        goalsFor,
        goalsAgainst,
        // A tied score after penalties does not establish the shootout outcome.
        outcome: fixture.stateId === 8 && !winner ? null : fixtureOutcome(fixture, input.teamId)
      }
    })
}
