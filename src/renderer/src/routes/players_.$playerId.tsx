import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PlayerPage } from '@/features/players/player-page'

const playerSearchSchema = z.object({
  competition: positiveIdSearch(),
  team: positiveIdSearch()
})

export const Route = createFileRoute('/players_/$playerId')({
  validateSearch: playerSearchSchema,
  component: PlayerRoute
})

function PlayerRoute(): React.JSX.Element {
  const { playerId } = Route.useParams()
  const { competition, team } = Route.useSearch()
  return <PlayerPage competitionId={competition} playerId={playerId} teamId={team} />
}

function positiveIdSearch(): z.ZodType<number | undefined> {
  return z.preprocess((value) => {
    const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
  }, z.number().int().positive().optional())
}
