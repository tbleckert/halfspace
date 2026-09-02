import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CoachPage } from '@/features/coaches/coach-page'
import { isIsoDate } from '@/lib/date'

const coachSearchSchema = z.object({
  competition: positiveIdSearch(),
  date: z.string().refine(isIsoDate).optional().catch(undefined),
  season: positiveIdSearch(),
  team: positiveIdSearch()
})

export const Route = createFileRoute('/coaches_/$coachId')({
  validateSearch: coachSearchSchema,
  component: CoachRoute
})

function CoachRoute(): React.JSX.Element {
  const { coachId } = Route.useParams()
  const { competition, date, season, team } = Route.useSearch()

  return (
    <CoachPage
      coachId={coachId}
      competitionId={competition}
      date={date}
      season={season}
      teamId={team}
    />
  )
}

function positiveIdSearch(): z.ZodType<number | undefined> {
  return z.preprocess((value) => {
    const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
  }, z.number().int().positive().optional())
}
