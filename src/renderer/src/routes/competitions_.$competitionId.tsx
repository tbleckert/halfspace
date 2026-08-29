import { createFileRoute, Outlet, useMatchRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CompetitionWorkspacePage } from '@/features/competitions/competition-workspace-page'
import { isIsoDate } from '@/lib/date'

const optionalPositiveId = z.preprocess((value) => {
  const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
}, z.number().int().positive().optional())

const competitionSearchSchema = z.object({
  date: z.string().refine(isIsoDate).optional().catch(undefined),
  season: optionalPositiveId
})

export const Route = createFileRoute('/competitions_/$competitionId')({
  validateSearch: competitionSearchSchema,
  component: CompetitionWorkspaceRoute
})

function CompetitionWorkspaceRoute(): React.JSX.Element {
  const { competitionId } = Route.useParams()
  const { date, season } = Route.useSearch()
  const matchRoute = useMatchRoute()
  const view = matchRoute({
    to: '/competitions/$competitionId/fixtures',
    params: { competitionId },
    fuzzy: false
  })
    ? 'fixtures'
    : matchRoute({
          to: '/competitions/$competitionId/teams',
          params: { competitionId },
          fuzzy: false
        })
      ? 'teams'
      : 'overview'

  return (
    <>
      <CompetitionWorkspacePage
        competitionId={competitionId}
        date={date}
        season={season}
        view={view}
      />
      <Outlet />
    </>
  )
}
