import { createFileRoute } from '@tanstack/react-router'
import { CompetitionWorkspacePage } from '@/features/competitions/competition-workspace-page'

export const Route = createFileRoute('/competitions_/$competitionId')({
  component: CompetitionWorkspaceRoute
})

function CompetitionWorkspaceRoute(): React.JSX.Element {
  const { competitionId } = Route.useParams()
  return <CompetitionWorkspacePage competitionId={competitionId} />
}
