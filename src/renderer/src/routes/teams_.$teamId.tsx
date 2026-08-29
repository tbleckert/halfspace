import { createFileRoute, Outlet, useMatchRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { TeamPage } from '@/features/teams/team-page'
import { isIsoDate } from '@/lib/date'

const teamSearchSchema = z.object({
  competition: z.preprocess((value) => {
    const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
  }, z.number().int().positive().optional()),
  date: z.string().refine(isIsoDate).optional().catch(undefined)
})

export const Route = createFileRoute('/teams_/$teamId')({
  validateSearch: teamSearchSchema,
  component: TeamRoute
})

function TeamRoute(): React.JSX.Element {
  const { teamId } = Route.useParams()
  const { competition, date } = Route.useSearch()
  const matchRoute = useMatchRoute()
  const view = matchRoute({
    to: '/teams/$teamId/fixtures',
    params: { teamId },
    fuzzy: false
  })
    ? 'fixtures'
    : matchRoute({
          to: '/teams/$teamId/squad',
          params: { teamId },
          fuzzy: false
        })
      ? 'squad'
      : 'overview'

  return (
    <>
      <TeamPage competitionId={competition} date={date} teamId={teamId} view={view} />
      <Outlet />
    </>
  )
}
