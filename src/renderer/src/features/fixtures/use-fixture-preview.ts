import { useMemo } from 'react'
import type { RefreshFixtureHeadToHeadInput } from '@shared/contracts'
import { prefetchStandings, useStandings } from '@/features/competitions/use-competition-workspace'
import { prefetchTeamFixtures, useTeamFixtures } from '@/features/teams/use-team'
import { fixturePreviewTeamInput } from './fixture-preview-data'
import { prefetchFixtureHeadToHead, useFixtureHeadToHead } from './use-fixtures'

export interface FixturePreviewInput {
  fixtureId: number
  seasonId: number
  startingAt: number
  homeTeamId: number
  awayTeamId: number
  timeZone: string
}

interface FixturePreviewQueries {
  standings: ReturnType<typeof useStandings>
  homeFixtures: ReturnType<typeof useTeamFixtures>
  awayFixtures: ReturnType<typeof useTeamFixtures>
  headToHead: ReturnType<typeof useFixtureHeadToHead>
}

export function useFixturePreview(
  input: FixturePreviewInput | null,
  enabled: boolean
): FixturePreviewQueries {
  const homeFixturesInput = useMemo(
    () =>
      input ? fixturePreviewTeamInput(input.homeTeamId, input.startingAt, input.timeZone) : null,
    [input]
  )
  const awayFixturesInput = useMemo(
    () =>
      input ? fixturePreviewTeamInput(input.awayTeamId, input.startingAt, input.timeZone) : null,
    [input]
  )
  const headToHeadInput = useMemo(() => (input ? fixtureHeadToHeadInput(input) : null), [input])

  return {
    standings: useStandings(input?.seasonId ?? null, enabled && input !== null),
    homeFixtures: useTeamFixtures(homeFixturesInput, enabled && input !== null),
    awayFixtures: useTeamFixtures(awayFixturesInput, enabled && input !== null),
    headToHead: useFixtureHeadToHead(headToHeadInput, enabled && input !== null)
  }
}

export async function prefetchFixturePreview(input: FixturePreviewInput): Promise<void> {
  await Promise.all([
    prefetchStandings(input.seasonId),
    prefetchTeamFixtures(
      fixturePreviewTeamInput(input.homeTeamId, input.startingAt, input.timeZone)
    ),
    prefetchTeamFixtures(
      fixturePreviewTeamInput(input.awayTeamId, input.startingAt, input.timeZone)
    ),
    prefetchFixtureHeadToHead(fixtureHeadToHeadInput(input))
  ])
}

function fixtureHeadToHeadInput(input: FixturePreviewInput): RefreshFixtureHeadToHeadInput {
  return {
    firstTeamId: input.homeTeamId,
    secondTeamId: input.awayTeamId,
    timeZone: input.timeZone
  }
}
