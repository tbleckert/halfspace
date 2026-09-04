import type { SportmonksAggregate, SportmonksBracketEdge } from '@shared/contracts'
import type { CachedFixture, readSeasonBracket, readSeasonSchedule } from '@/data/db'

export interface KnockoutTie {
  id: string
  fixtures: CachedFixture[]
  aggregate?: SportmonksAggregate
  winnerId: number | null
}
export interface KnockoutRound {
  id: number
  name: string
  ties: KnockoutTie[]
}
export interface KnockoutProgression {
  parentTieId: string
  childTieId: string
  parentFixtureId: number
  childFixtureId: number
  outcome: 'winner' | 'loser'
  slot: 'home' | 'away'
  source: 'provider' | 'result'
}

export function knockoutRounds(
  schedule: Awaited<ReturnType<typeof readSeasonSchedule>> | undefined,
  bracket: Awaited<ReturnType<typeof readSeasonBracket>> | undefined
): KnockoutRound[] {
  if (!bracket) return []
  const fixtures = [
    ...new Map(
      [...(schedule?.fixtures ?? []), ...bracket.fixtures].map((fixture) => [fixture.id, fixture])
    ).values()
  ]
  const catalogs = new Map(bracket.catalog.map((stage) => [stage.id, stage]))
  const stages = new Map(
    bracket.catalog.map((stage) => [stage.id, { id: stage.id, name: stage.name }])
  )
  for (const stage of bracket.stages)
    stages.set(stage.stage_id, { id: stage.stage_id, name: stage.stage_name })
  const stageFixtures = (stageId: number): CachedFixture[] =>
    fixtures.filter((fixture) => fixture.raw.stage_id === stageId)
  const startDate = (stageId: number): string =>
    catalogs.get(stageId)?.starting_at ??
    stageFixtures(stageId)
      .map((fixture) => fixture.raw.starting_at)
      .filter((date): date is string => !!date)
      .sort()[0] ??
    '9999'
  return [...stages.values()]
    .sort(
      (a, b) =>
        startDate(a.id).localeCompare(startDate(b.id)) ||
        (catalogs.get(a.id)?.sort_order ?? 0) - (catalogs.get(b.id)?.sort_order ?? 0)
    )
    .map((stage) => {
      const aggregates = catalogs.get(stage.id)?.aggregates ?? []
      const groups = new Map<string, KnockoutTie>()
      for (const fixture of stageFixtures(stage.id).sort(
        (a, b) => (a.startingAt ?? Infinity) - (b.startingAt ?? Infinity) || a.id - b.id
      )) {
        const aggregate = aggregates.find((aggregate) => aggregate.fixture_ids.includes(fixture.id))
        const aggregateId = aggregate?.id ?? fixture.raw.aggregate_id
        const id = aggregateId ? `aggregate:${aggregateId}` : `fixture:${fixture.id}`
        const tie = groups.get(id) ?? { id, fixtures: [], aggregate, winnerId: null }
        tie.fixtures.push(fixture)
        groups.set(id, tie)
      }
      for (const tie of groups.values()) {
        tie.winnerId = tie.aggregate?.winner_participant_id ?? null
        if (
          !tie.aggregate &&
          tie.fixtures.length === 1 &&
          !tie.fixtures[0].raw.aggregate_id &&
          !tie.fixtures[0].placeholder
        ) {
          tie.winnerId =
            tie.fixtures[0].raw.participants.find(
              (participant) => participant.meta?.winner && !participant.placeholder
            )?.id ?? null
        }
      }
      return { ...stage, ties: [...groups.values()] }
    })
}

export function knockoutProgression(
  rounds: KnockoutRound[],
  edges: SportmonksBracketEdge[]
): KnockoutProgression[] {
  const ties = rounds.flatMap((round) => round.ties)
  const byFixture = new Map(
    ties.flatMap((tie) => tie.fixtures.map((fixture) => [fixture.id, tie] as const))
  )
  const links: KnockoutProgression[] = []
  for (const edge of edges) {
    const parent = byFixture.get(edge.parent_fixture_id)
    const child = byFixture.get(edge.child_fixture_id)
    if (!parent || !child || parent === child) continue
    links.push({
      parentTieId: parent.id,
      childTieId: child.id,
      parentFixtureId: edge.parent_fixture_id,
      childFixtureId: edge.child_fixture_id,
      outcome: edge.parent_outcome,
      slot: edge.child_slot,
      source: 'provider'
    })
  }
  for (const [roundIndex, round] of rounds.entries()) {
    for (const parent of round.ties) {
      if (
        !parent.winnerId ||
        links.some((link) => link.parentTieId === parent.id && link.outcome === 'winner')
      )
        continue
      const next = rounds
        .slice(roundIndex + 1, roundIndex + 2)
        .flatMap((round) => round.ties)
        .find((tie) =>
          tie.fixtures.some(
            (fixture) =>
              !fixture.placeholder &&
              fixture.raw.participants.some(
                (participant) => participant.id === parent.winnerId && !participant.placeholder
              )
          )
        )
      if (!next) continue
      const child = next.fixtures[0]
      const slot = child.raw.participants.find((participant) => participant.id === parent.winnerId)
        ?.meta?.location
      if (!slot || links.some((link) => link.childTieId === next.id && link.slot === slot)) continue
      links.push({
        parentTieId: parent.id,
        childTieId: next.id,
        parentFixtureId: parent.fixtures.at(-1)!.id,
        childFixtureId: child.id,
        outcome: 'winner',
        slot,
        source: 'result'
      })
    }
  }
  return links
}
