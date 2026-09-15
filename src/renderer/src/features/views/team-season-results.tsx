import type { ViewBlock } from '@shared/views'
import { seasonTeamResults } from './team-view-data'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { useSeasonSchedule } from '@/features/competitions/use-season-schedule'
import { useCompetitionDetail } from '@/features/competitions/use-competition-detail'
import { useCompetitionSeasons } from '@/features/competitions/use-competition-workspace'
import { EntityFixtureRow } from '@/features/fixtures/entity-fixture-panel'
import { BlockEmpty, BlockError, BlockPending } from './view-block-state'

type SeasonResultsBlock = Extract<ViewBlock, { type: 'team-season-results' }>

export function TeamSeasonResults({
  block,
  online
}: {
  block: SeasonResultsBlock
  online: boolean
}): React.JSX.Element {
  const query = useSeasonSchedule(block.seasonId, online)
  const competition = useCompetitionDetail(block.competitionId, online)
  const seasons = useCompetitionSeasons(block.competitionId, online)
  const season =
    seasons.cached?.seasons.find((season) => season.id === block.seasonId) ??
    competition.cached?.competition?.raw.currentseason
  const fixtures = seasonTeamResults(query.cached?.fixtures ?? [], block)
  return (
    <div className="space-y-2">
      <BlockError error={query.error} online={online} refresh={query.refresh} />
      {!query.cached ? (
        <BlockPending
          block={block}
          online={online}
          error={query.error}
          loading={query.refreshing || query.cached === undefined}
        />
      ) : (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Season results</CardTitle>
            <p className="text-xs text-muted-foreground">
              {competition.cached?.competition?.name ?? `Competition ${block.competitionId}`} ·{' '}
              {season?.id === block.seasonId ? season.name : `Season ${block.seasonId}`} ·{' '}
              {fixtures.length} reported matches
            </p>
          </CardHeader>
          {fixtures.length ? (
            <div
              role="region"
              aria-label="Season results list"
              tabIndex={0}
              className="grid max-h-[min(470px,60dvh)] grid-cols-1 gap-2 overflow-auto overscroll-y-contain rounded-b-xl px-3 pb-3 [scrollbar-width:thin] [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring @min-[520px]/view-widget:grid-cols-2 @min-[860px]/view-widget:grid-cols-3"
            >
              {fixtures.map((fixture) => (
                <EntityFixtureRow
                  key={fixture.id}
                  fixture={fixture}
                  context={{
                    team: block.teamId,
                    competition: block.competitionId,
                    season: block.seasonId
                  }}
                  dateDisplay="historical"
                  fixtureSeasonLinks
                  online={online}
                  showCompetition={false}
                />
              ))}
            </div>
          ) : (
            <BlockEmpty>No completed matches reported for this team in this season.</BlockEmpty>
          )}
        </Card>
      )}
    </div>
  )
}
