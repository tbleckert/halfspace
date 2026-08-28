import { createFileRoute } from '@tanstack/react-router'

import { TeamPage } from '@/features/teams/team-page'

type TeamSearch = {
  competition?: number
}

export const Route = createFileRoute('/teams_/$teamId_/squad')({
  component: TeamSquadRoute,
  validateSearch: (search: Record<string, unknown>): TeamSearch => ({
    competition: typeof search.competition === 'number' ? search.competition : undefined
  })
})

function TeamSquadRoute(): React.JSX.Element {
  const { teamId } = Route.useParams()
  const { competition } = Route.useSearch()

  return <TeamPage competitionId={competition} teamId={teamId} view="squad" />
}
