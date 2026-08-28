import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { TeamPage } from '@/features/teams/team-page'

const teamSearchSchema = z.object({
  competition: z.preprocess((value) => {
    const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
  }, z.number().int().positive().optional())
})

export const Route = createFileRoute('/teams_/$teamId')({
  validateSearch: teamSearchSchema,
  component: TeamRoute
})

function TeamRoute(): React.JSX.Element {
  const { teamId } = Route.useParams()
  const { competition } = Route.useSearch()
  return <TeamPage competitionId={competition} teamId={teamId} />
}
