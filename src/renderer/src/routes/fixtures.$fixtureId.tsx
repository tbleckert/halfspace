import { createFileRoute, Outlet, useMatchRoute } from '@tanstack/react-router'
import { FixtureDetailPage, type FixtureView } from '@/features/fixtures/fixture-detail-page'
import { fixtureDetailSearchSchema } from '@/features/fixtures/fixture-route'

export const Route = createFileRoute('/fixtures/$fixtureId')({
  validateSearch: fixtureDetailSearchSchema,
  component: FixtureDetailRoute
})

function FixtureDetailRoute(): React.JSX.Element {
  const { fixtureId } = Route.useParams()
  const { competition, date, season, team, oddsFeed, market, bookmaker } = Route.useSearch()
  const matchRoute = useMatchRoute()
  let view: FixtureView | undefined

  if (matchRoute({ to: '/fixtures/$fixtureId/commentary', params: { fixtureId }, fuzzy: false })) {
    view = 'commentary'
  } else if (
    matchRoute({
      to: '/fixtures/$fixtureId/game',
      params: { fixtureId },
      fuzzy: false
    })
  ) {
    view = 'game'
  } else if (
    matchRoute({ to: '/fixtures/$fixtureId/preview', params: { fixtureId }, fuzzy: false })
  ) {
    view = 'preview'
  } else if (
    matchRoute({
      to: '/fixtures/$fixtureId/lineups',
      params: { fixtureId },
      fuzzy: false
    })
  ) {
    view = 'lineups'
  } else if (
    matchRoute({
      to: '/fixtures/$fixtureId/stats',
      params: { fixtureId },
      fuzzy: false
    })
  ) {
    view = 'stats'
  } else if (
    matchRoute({
      to: '/fixtures/$fixtureId/odds',
      params: { fixtureId },
      fuzzy: false
    })
  ) {
    view = 'odds'
  }

  return (
    <>
      <FixtureDetailPage
        competitionId={competition}
        date={date}
        fixtureId={fixtureId}
        seasonId={season}
        teamId={team}
        view={view}
        oddsFeed={oddsFeed}
        marketId={market}
        bookmakerId={bookmaker}
      />
      <Outlet />
    </>
  )
}
