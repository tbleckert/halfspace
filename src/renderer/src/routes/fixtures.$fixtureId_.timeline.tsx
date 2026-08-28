import { createFileRoute } from '@tanstack/react-router'
import { FixtureDetailPage } from '@/features/fixtures/fixture-detail-page'
import { fixtureDetailSearchSchema } from '@/features/fixtures/fixture-route'

export const Route = createFileRoute('/fixtures/$fixtureId_/timeline')({
  validateSearch: fixtureDetailSearchSchema,
  component: FixtureTimelineRoute
})

function FixtureTimelineRoute(): React.JSX.Element {
  const { fixtureId } = Route.useParams()
  const { competition, date, team } = Route.useSearch()
  return (
    <FixtureDetailPage
      competitionId={competition}
      date={date}
      fixtureId={fixtureId}
      teamId={team}
      view="timeline"
    />
  )
}
