import type {
  PlayerViewSelection,
  TeamViewSelection,
  ViewBlock,
  ViewResearchContext,
  ViewStatisticContext
} from '@shared/views'
import { db } from '@/data/db'

export function statisticContextKey(context: ViewStatisticContext): string {
  return `${context.kind}:${context.entityId}:${context.teamId}:${context.competitionId}:${context.seasonId}`
}
export function playerViewSelection(context: ViewStatisticContext): PlayerViewSelection {
  return {
    playerId: context.entityId,
    teamId: context.teamId,
    competitionId: context.competitionId,
    seasonId: context.seasonId
  }
}
export function teamViewSelection(context: ViewStatisticContext): TeamViewSelection {
  return {
    teamId: context.teamId,
    competitionId: context.competitionId,
    seasonId: context.seasonId,
    matchLocation: 'all'
  }
}
export async function readViewResearchContext(): Promise<ViewResearchContext> {
  const [queries, players, teams, odds, fixtures] = await Promise.all([
    db.statisticSeasonQueries.toArray(),
    db.players.toArray(),
    db.teams.toArray(),
    db.fixtureOdds.toArray(),
    db.fixtures.toArray()
  ])
  const statistics: ViewStatisticContext[] = queries.flatMap((query) => {
    const [kind, id] = query.key.split(':')
    if (kind !== 'players' && kind !== 'teams') return []
    const entityId = Number(id)
    const entityName =
      kind === 'players'
        ? players.find((player) => player.id === entityId)?.displayName
        : teams.find((team) => team.id === entityId)?.name
    return query.records
      .filter((record) => kind !== 'teams' || record.teamId === entityId)
      .map((record) => ({
        kind,
        entityId,
        entityName: entityName ?? `${kind === 'players' ? 'Player' : 'Team'} ${entityId}`,
        teamId: record.teamId,
        teamName: record.teamName,
        competitionId: record.season.league_id,
        competitionName: record.competitionName,
        seasonId: record.season.id,
        seasonName: record.season.name
      }))
  })
  const markets = new Map<number, string>()
  const bookmakers = new Map<number, string>()
  for (const { raw: quote } of odds) {
    markets.set(quote.market_id, quote.market?.name ?? `Market ${quote.market_id}`)
    bookmakers.set(quote.bookmaker_id, quote.bookmaker?.name ?? `Bookmaker ${quote.bookmaker_id}`)
  }
  return {
    statistics,
    fixtures: fixtures.map((fixture) => ({
      fixtureId: fixture.id,
      competitionId: fixture.leagueId,
      seasonId: fixture.seasonId,
      name: fixture.name ?? `Fixture ${fixture.id}`
    })),
    markets: [...markets].map(([id, name]) => ({ id, name })),
    bookmakers: [...bookmakers].map(([id, name]) => ({ id, name }))
  }
}

export function viewResearchContext(
  cached: ViewResearchContext,
  blocks: readonly ViewBlock[]
): ViewResearchContext {
  const fixtures = new Map<number, ViewResearchContext['fixtures'][number]>()
  const statistics = new Map<string, ViewStatisticContext>()
  const markets = new Map<number, string>()
  const bookmakers = new Map<number, string>()
  // Keep explicitly saved selections usable when disposable football metadata is cleared.
  for (const block of blocks) {
    if (
      block.type === 'player-profile' ||
      block.type === 'player-comparison' ||
      block.type === 'team-comparison'
    ) {
      const selections =
        block.type === 'player-profile' ? [block.selection] : [block.left, block.right]
      for (const selection of selections) {
        const kind = 'playerId' in selection ? 'players' : 'teams'
        const entityId = 'playerId' in selection ? selection.playerId : selection.teamId
        const context: ViewStatisticContext = {
          kind,
          entityId,
          entityName: `${kind === 'players' ? 'Player' : 'Team'} ${entityId}`,
          teamId: selection.teamId,
          teamName: `Team ${selection.teamId}`,
          competitionId: selection.competitionId,
          competitionName: `Competition ${selection.competitionId}`,
          seasonId: selection.seasonId,
          seasonName: `Season ${selection.seasonId}`
        }
        statistics.set(statisticContextKey(context), context)
      }
    }
    if (block.type === 'market-shortlist' && block.selectedFixtureId !== null)
      fixtures.set(block.selectedFixtureId, {
        fixtureId: block.selectedFixtureId,
        competitionId: block.competitionId,
        seasonId: block.seasonId,
        name: `Fixture ${block.selectedFixtureId}`
      })
    if (block.type === 'odds-comparison') {
      if (block.marketId !== null) markets.set(block.marketId, `Market ${block.marketId}`)
      if (block.bookmakerId !== null)
        bookmakers.set(block.bookmakerId, `Bookmaker ${block.bookmakerId}`)
    }
  }
  for (const fixture of cached.fixtures) fixtures.set(fixture.fixtureId, fixture)
  for (const context of cached.statistics) statistics.set(statisticContextKey(context), context)
  for (const market of cached.markets) markets.set(market.id, market.name)
  for (const bookmaker of cached.bookmakers) bookmakers.set(bookmaker.id, bookmaker.name)
  return {
    fixtures: [...fixtures.values()].slice(0, 250),
    statistics: [...statistics.values()].slice(0, 250),
    markets: [...markets].slice(0, 250).map(([id, name]) => ({ id, name })),
    bookmakers: [...bookmakers].slice(0, 250).map(([id, name]) => ({ id, name }))
  }
}
