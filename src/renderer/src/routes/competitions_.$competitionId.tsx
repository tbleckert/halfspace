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
  season: optionalPositiveId,
  stage: optionalPositiveId,
  round: optionalPositiveId,
  table: z.literal('live').optional().catch(undefined),
  leaderboard: z.enum(['goals', 'assists', 'yellow-cards', 'red-cards']).optional().catch(undefined)
})

export const Route = createFileRoute('/competitions_/$competitionId')({
  validateSearch: competitionSearchSchema,
  component: CompetitionWorkspaceRoute
})

function CompetitionWorkspaceRoute(): React.JSX.Element {
  const { competitionId } = Route.useParams()
  const { date, season, leaderboard, stage, round, table } = Route.useSearch()
  const matchRoute = useMatchRoute()
  const view = matchRoute({
    to: '/competitions/$competitionId/referees',
    params: { competitionId },
    fuzzy: false
  })
    ? 'referees'
    : matchRoute({
          to: '/competitions/$competitionId/venues',
          params: { competitionId },
          fuzzy: false
        })
      ? 'venues'
      : matchRoute({
            to: '/competitions/$competitionId/knockout',
            params: { competitionId },
            fuzzy: false
          })
        ? 'knockout'
        : matchRoute({
              to: '/competitions/$competitionId/table',
              params: { competitionId },
              fuzzy: false
            })
          ? 'table'
          : matchRoute({
                to: '/competitions/$competitionId/team-of-week',
                params: { competitionId },
                fuzzy: false
              })
            ? 'team-of-week'
            : matchRoute({
                  to: '/competitions/$competitionId/schedule',
                  params: { competitionId },
                  fuzzy: false
                })
              ? 'schedule'
              : matchRoute({
                    to: '/competitions/$competitionId/fixtures',
                    params: { competitionId },
                    fuzzy: false
                  })
                ? 'fixtures'
                : matchRoute({
                      to: '/competitions/$competitionId/stats',
                      params: { competitionId },
                      fuzzy: false
                    })
                  ? 'stats'
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
        leaderboard={leaderboard}
        stage={stage}
        round={round}
        table={table}
        view={view}
      />
      <Outlet />
    </>
  )
}
