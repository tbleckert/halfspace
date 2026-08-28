import { createFileRoute } from '@tanstack/react-router'
import { FixtureDetailPage } from '@/features/fixtures/fixture-detail-page'

export const Route = createFileRoute('/fixtures/$fixtureId')({
  component: FixtureDetailRoute
})

function FixtureDetailRoute(): React.JSX.Element {
  const { fixtureId } = Route.useParams()
  return <FixtureDetailPage fixtureId={fixtureId} />
}
