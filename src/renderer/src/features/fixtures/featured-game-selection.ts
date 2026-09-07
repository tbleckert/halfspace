import type { CachedFixture } from '@/data/db'
import { isFixtureOngoing } from '@/lib/fixture-state'

export type KnockoutStage = 'quarter-final' | 'semi-final' | 'final'
export interface FeaturedSignals {
  halfway?: boolean
  currentTopFour?: boolean
  previousTopFour?: boolean
  rivalry?: boolean
  sameCity?: boolean
  knockout?: KnockoutStage
  pinnedCompetition?: boolean
  pinnedTeams?: number
}
export interface FeaturedCandidate {
  fixture: CachedFixture
  signals: FeaturedSignals
}
export interface ScoredFeaturedGame extends FeaturedCandidate {
  points: number
  reasons: string[]
}

// Editorial weights by Sportmonks competition ID; other competitions start at zero.
export const competitionWeights: Readonly<Record<number, number>> = {
  2: 20, // Champions League
  8: 18, // Premier League
  564: 18, // La Liga
  82: 16, // Bundesliga
  384: 16, // Serie A
  301: 14, // Ligue 1
  5: 14 // Europa League
}
const completedStates = new Set([5, 7, 8])
const excludedStates = new Set([4, 10, 11, 12, 14, 15, 16, 17, 19])
export const featuredGameThreshold = 45

export function sameCityMatch(
  home: number | null | undefined,
  away: number | null | undefined,
  fixture: number | null | undefined
): boolean {
  return home != null && home > 0 && home === away && home === fixture
}

export function knockoutStage(name: string | undefined | null): KnockoutStage | undefined {
  const normalized = name?.trim().toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ')
  if (/^quarter finals?$/.test(normalized ?? '')) return 'quarter-final'
  if (/^semi finals?$/.test(normalized ?? '')) return 'semi-final'
  if (/^finals?$/.test(normalized ?? '')) return 'final'
  return undefined
}

export function scoreFeaturedGame(
  fixture: CachedFixture,
  signals: FeaturedSignals,
  now: number
): ScoredFeaturedGame {
  let points = competitionWeights[fixture.leagueId] ?? 0
  const reasons: string[] = []
  function add(value: number, reason?: string): void {
    points += value
    if (reason) reasons.push(reason)
  }
  if (signals.rivalry) add(25, 'Rivalry')
  if (signals.sameCity) add(10, 'City derby')
  if (signals.knockout) {
    const weights = { 'quarter-final': 10, 'semi-final': 15, final: 20 }
    const labels = { 'quarter-final': 'Quarter-final', 'semi-final': 'Semi-final', final: 'Final' }
    add(weights[signals.knockout], labels[signals.knockout])
  }
  if (signals.halfway && signals.currentTopFour) add(20, 'Top-four matchup')
  if (signals.previousTopFour) add(15, 'Last season’s top four')
  if (signals.pinnedTeams)
    add(signals.pinnedTeams >= 2 ? 35 : 25, 'Pinned team' + (signals.pinnedTeams >= 2 ? 's' : ''))
  if (signals.pinnedCompetition) add(15)
  if (
    isFixtureOngoing(fixture.stateId) ||
    (fixture.stateId === 1 &&
      fixture.startingAt !== null &&
      fixture.startingAt >= now &&
      fixture.startingAt - now <= 90 * 60_000)
  )
    add(10)
  return { fixture, signals, points, reasons }
}

export function selectFeaturedGame(
  candidates: FeaturedCandidate[],
  now: number,
  previousId?: number
): ScoredFeaturedGame | null {
  const valid = candidates.filter(
    ({ fixture }) =>
      !fixture.placeholder &&
      fixture.homeTeamId !== null &&
      fixture.awayTeamId !== null &&
      !excludedStates.has(fixture.stateId)
  )
  if (valid.length < 5) return null
  const scored = valid
    .map(({ fixture, signals }) => scoreFeaturedGame(fixture, signals, now))
    .sort(
      (a, b) =>
        b.points - a.points ||
        (a.fixture.startingAt ?? Infinity) - (b.fixture.startingAt ?? Infinity) ||
        a.fixture.id - b.fixture.id
    )
  const unfinished = scored.filter(
    ({ fixture }) => fixture.stateId === 1 || isFixtureOngoing(fixture.stateId)
  )
  const previous = scored.find(({ fixture }) => fixture.id === previousId)
  if (previous && unfinished.some(({ fixture }) => fixture.id === previousId)) return previous
  const winner =
    unfinished[0] ??
    (previous && completedStates.has(previous.fixture.stateId)
      ? previous
      : scored.find(({ fixture }) => completedStates.has(fixture.stateId)))
  if (!winner || (valid.length <= 10 && winner.points < featuredGameThreshold)) return null
  return winner
}
