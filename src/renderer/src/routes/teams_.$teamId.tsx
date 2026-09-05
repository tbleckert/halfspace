import { createFileRoute, Outlet, useMatchRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { TeamPage } from '@/features/teams/team-page'
import { isIsoDate } from '@/lib/date'

const teamSearchSchema = z.object({
  rumourPage: z.coerce.number().int().positive().optional().catch(undefined),
  stage: z.coerce.number().int().positive().optional().catch(undefined),
  competition: z.preprocess((value) => {
    const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
  }, z.number().int().positive().optional()),
  date: z.string().refine(isIsoDate).optional().catch(undefined),
  season: z.preprocess((value) => {
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
  const { competition, date, season, rumourPage, stage } = Route.useSearch()
  const matchRoute = useMatchRoute()
  const view = matchRoute({ to: '/teams/$teamId/schedule', params: { teamId }, fuzzy: false })
    ? 'schedule'
    : matchRoute({ to: '/teams/$teamId/rumours', params: { teamId }, fuzzy: false })
      ? 'rumours'
      : matchRoute({
            to: '/teams/$teamId/transfers',
            params: { teamId },
            fuzzy: false
          })
        ? 'transfers'
        : matchRoute({
              to: '/teams/$teamId/fixtures',
              params: { teamId },
              fuzzy: false
            })
          ? 'fixtures'
          : matchRoute({
                to: '/teams/$teamId/stats',
                params: { teamId },
                fuzzy: false
              })
            ? 'stats'
            : matchRoute({
                  to: '/teams/$teamId/squad',
                  params: { teamId },
                  fuzzy: false
                })
              ? 'squad'
              : 'overview'

  return (
    <>
      <TeamPage
        competitionId={competition}
        date={date}
        season={season}
        stage={stage}
        rumourPage={rumourPage}
        teamId={teamId}
        view={view}
      />
      <Outlet />
    </>
  )
}
