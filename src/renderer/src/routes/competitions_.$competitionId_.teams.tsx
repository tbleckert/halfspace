import { createFileRoute } from '@tanstack/react-router'
import { CompetitionWorkspacePage } from '@/features/competitions/competition-workspace-page'

export const Route = createFileRoute('/competitions_/$competitionId_/teams')({
  component: CompetitionTeamsRoute
})

function CompetitionTeamsRoute(): React.JSX.Element {
  const { competitionId } = Route.useParams()

  return <CompetitionWorkspacePage competitionId={competitionId} view="teams" />
}
