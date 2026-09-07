import { isFixtureOngoing } from '@/lib/fixture-state'
import type { SportmonksSeason } from '@shared/contracts'
import {
  db,
  readFixtureQuery,
  readCompetitionSeasons,
  readSeasonSchedule,
  readStandingsQuery,
  type CachedFixture,
  type CachedStanding
} from '@/data/db'
import {
  prefetchStandings,
  prefetchCompetitionSeasons
} from '@/features/competitions/use-competition-workspace'
import { prefetchSeasonSchedule } from '@/features/competitions/use-season-schedule'
import { prefetchTeamEntity } from '@/features/teams/use-team'
import { refreshTeamRivals } from '@/features/teams/use-team-rivals'
import {
  knockoutStage,
  sameCityMatch,
  selectFeaturedGame,
  type FeaturedCandidate
} from './featured-game-selection'

export function previousCompletedSeason(
  seasons: SportmonksSeason[],
  currentId: number,
  date: string
): SportmonksSeason | undefined {
  const current = seasons.find(({ id }) => id === currentId)
  if (!current?.starting_at) return undefined
  return seasons
    .filter(
      (season) =>
        season.id !== currentId &&
        season.league_id === current.league_id &&
        season.ending_at &&
        season.ending_at < current.starting_at! &&
        season.ending_at < date
    )
    .sort((a, b) => b.ending_at!.localeCompare(a.ending_at!))[0]
}

export function isTopFourMatch(
  standings: CachedStanding[],
  home: number | null,
  away: number | null
): boolean {
  if (home === null || away === null || home === away) return false
  // Group tables and multiple stages are not one league-wide top four.
  if (
    standings.length < 5 ||
    standings.some(({ groupId }) => groupId !== null) ||
    new Set(standings.map(({ stageId }) => stageId)).size !== 1
  )
    return false
  const top = standings.filter(({ position }) => position >= 1 && position <= 4)
  return (
    top.length === 4 &&
    new Set(top.map(({ position }) => position)).size === 4 &&
    top.some(({ participantId }) => participantId === home) &&
    top.some(({ participantId }) => participantId === away)
  )
}

export function isHalfwayThroughSchedule(
  schedule: Awaited<ReturnType<typeof readSeasonSchedule>>
): boolean {
  if (!schedule || schedule.stages.length !== 1 || !schedule.fixtures.length) return false
  const stage = schedule.stages[0]
  if (
    stage.rounds.some(({ fixtureIds }) => fixtureIds.length === 0) ||
    schedule.fixtures.some(({ placeholder }) => placeholder)
  )
    return false
  return (
    schedule.fixtures.filter(({ stateId }) => [5, 7, 8].includes(stateId)).length /
      schedule.fixtures.length >=
    0.5
  )
}

export async function readFeaturedCandidates(
  fixtures: CachedFixture[],
  date: string
): Promise<FeaturedCandidate[]> {
  const [teams, pins, competitionPins] = await Promise.all([
    db.teams.bulkGet([
      ...new Set(
        fixtures
          .flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId])
          .filter((id): id is number => id !== null)
      )
    ]),
    db.teamPins.toArray(),
    db.competitionPins.toArray()
  ])
  const teamById = new Map(teams.filter((team) => !!team).map((team) => [team.id, team]))
  const leagueContext = new Map<
    number,
    { current: CachedStanding[]; previous: CachedStanding[]; halfway: boolean; league: boolean }
  >()
  for (const fixture of fixtures) {
    if (leagueContext.has(fixture.seasonId)) continue
    const [seasons, competition, current, schedule] = await Promise.all([
      readCompetitionSeasons(fixture.leagueId),
      db.competitions.get(fixture.leagueId),
      readStandingsQuery(fixture.seasonId),
      readSeasonSchedule(fixture.seasonId)
    ])
    const previous = previousCompletedSeason(seasons?.seasons ?? [], fixture.seasonId, date)
    leagueContext.set(fixture.seasonId, {
      current: current.standings,
      previous: previous ? (await readStandingsQuery(previous.id)).standings : [],
      halfway: isHalfwayThroughSchedule(schedule),
      league: competition?.raw.type === 'league'
    })
  }
  return Promise.all(
    fixtures.map(async (fixture): Promise<FeaturedCandidate> => {
      const home = fixture.homeTeamId === null ? undefined : teamById.get(fixture.homeTeamId)
      const away = fixture.awayTeamId === null ? undefined : teamById.get(fixture.awayTeamId)
      const rivals = await db.teamRivalsQueries.bulkGet(
        [fixture.homeTeamId, fixture.awayTeamId].filter((id): id is number => id !== null)
      )
      const context = leagueContext.get(fixture.seasonId)!
      return {
        fixture,
        signals: {
          pinnedCompetition: competitionPins.some(
            ({ competitionId }) => competitionId === fixture.leagueId
          ),
          pinnedTeams: pins.filter(
            ({ teamId }) => teamId === fixture.homeTeamId || teamId === fixture.awayTeamId
          ).length,
          rivalry: rivals.some((query) =>
            query?.rivalIds.includes(
              query.teamId === fixture.homeTeamId ? fixture.awayTeamId! : fixture.homeTeamId!
            )
          ),
          sameCity: sameCityMatch(
            home?.raw.venue?.city_id,
            away?.raw.venue?.city_id,
            fixture.raw.venue?.city_id
          ),
          knockout: knockoutStage(fixture.raw.stage?.name),
          halfway: context.league && context.halfway,
          currentTopFour:
            context.league &&
            isTopFourMatch(context.current, fixture.homeTeamId, fixture.awayTeamId),
          previousTopFour:
            context.league &&
            isTopFourMatch(context.previous, fixture.homeTeamId, fixture.awayTeamId)
        }
      }
    })
  )
}

export async function warmFeaturedContext(
  fixtures: CachedFixture[],
  date: string,
  active: () => boolean
): Promise<void> {
  const unfinished = fixtures.filter(
    (fixture) => fixture.stateId === 1 || isFixtureOngoing(fixture.stateId)
  )
  const candidates = unfinished.length ? unfinished : fixtures
  const jobs: Array<() => Promise<void>> = []
  const seasons = new Map(candidates.map((fixture) => [fixture.seasonId, fixture.leagueId]))
  for (const [seasonId, leagueId] of seasons) {
    jobs.push(
      () => prefetchCompetitionSeasons(leagueId),
      () => prefetchSeasonSchedule(seasonId),
      () => prefetchStandings(seasonId),
      async () => {
        const seasons = await readCompetitionSeasons(leagueId)
        const previous = previousCompletedSeason(seasons?.seasons ?? [], seasonId, date)
        if (previous && active()) await prefetchStandings(previous.id)
      }
    )
  }
  const teamIds = [
    ...new Set(
      candidates
        .flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId])
        .filter((id): id is number => id !== null)
    )
  ]
  for (const teamId of teamIds)
    jobs.push(
      () => prefetchTeamEntity(teamId),
      async () => {
        const cached = await db.teamRivalsQueries.get(teamId)
        if ((!cached || cached.staleAt <= Date.now()) && active()) await refreshTeamRivals(teamId)
      }
    )
  for (const job of jobs) {
    if (!active()) return
    // An unavailable enrichment does not prevent selecting from the remaining known signals.
    await job().catch(() => undefined)
  }
}

export async function persistFeaturedSelection(
  date: string,
  timeZone: string,
  now: number
): Promise<void> {
  const key = `${date}|${timeZone}`
  await db.transaction(
    'rw',
    [
      db.featuredGameSelections,
      db.fixtureQueries,
      db.fixtures,
      db.teams,
      db.teamPins,
      db.competitionPins,
      db.competitions,
      db.competitionSeasonQueries,
      db.standingQueries,
      db.standings,
      db.seasonScheduleQueries,
      db.teamRivalsQueries
    ],
    async () => {
      const { query, fixtures } = await readFixtureQuery(date, timeZone)
      if (!query) return
      const previous = await db.featuredGameSelections.get(key)
      const selected = selectFeaturedGame(
        await readFeaturedCandidates(fixtures, date),
        now,
        previous?.fixtureId
      )
      if (selected && selected.fixture.id !== previous?.fixtureId)
        await db.featuredGameSelections.put({
          key,
          fixtureId: selected.fixture.id,
          selectedAt: now
        })
    }
  )
}
