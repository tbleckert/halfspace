import { createFileRoute, Outlet, useMatchRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CompetitionWorkspacePage } from '@/features/competitions/competition-workspace-page'
import { currentTimeZone, isIsoDate, todayInTimeZone } from '@/lib/date'

const defaultDate = todayInTimeZone(currentTimeZone())
const competitionSearchSchema = z.object({
  date: z.string().refine(isIsoDate).catch(defaultDate).default(defaultDate)
})

export const Route = createFileRoute('/competitions_/$competitionId')({
  validateSearch: competitionSearchSchema,
  component: CompetitionWorkspaceRoute
})

function CompetitionWorkspaceRoute(): React.JSX.Element {
  const { competitionId } = Route.useParams()
  const { date } = Route.useSearch()
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
      <CompetitionWorkspacePage competitionId={competitionId} date={date} view={view} />
      <Outlet />
    </>
  )
}
