import { createFileRoute, Outlet, useMatchRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PlayerPage } from '@/features/players/player-page'
import { isIsoDate } from '@/lib/date'

const playerSearchSchema = z.object({
  competition: positiveIdSearch(),
  date: z.string().refine(isIsoDate).optional().catch(undefined),
  season: positiveIdSearch(),
  team: positiveIdSearch()
})

export const Route = createFileRoute('/players_/$playerId')({
  validateSearch: playerSearchSchema,
  component: PlayerRoute
})

function PlayerRoute(): React.JSX.Element {
  const { playerId } = Route.useParams()
  const { competition, date, season, team } = Route.useSearch()
  const matchRoute = useMatchRoute()
  const view = matchRoute({
    to: '/players/$playerId/career',
    params: { playerId },
    fuzzy: false
  })
    ? 'career'
    : matchRoute({
          to: '/players/$playerId/stats',
          params: { playerId },
          fuzzy: false
        })
      ? 'stats'
      : matchRoute({
            to: '/players/$playerId/matches',
            params: { playerId },
            fuzzy: false
          })
        ? 'matches'
        : 'overview'

  return (
    <>
      <PlayerPage
        competitionId={competition}
        date={date}
        playerId={playerId}
        season={season}
        teamId={team}
        view={view}
      />
      <Outlet />
    </>
  )
}

function positiveIdSearch(): z.ZodType<number | undefined> {
  return z.preprocess((value) => {
    const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
  }, z.number().int().positive().optional())
}
