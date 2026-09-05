import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { isIsoDate } from '@/lib/date'
import { VenuePage } from '@/features/venues/venue-page'

const venueSearchSchema = z.object({
  competition: positiveIdSearch().optional(),
  season: positiveIdSearch().optional(),
  date: z.string().refine(isIsoDate).optional().catch(undefined),
  team: positiveIdSearch().optional()
})

export const Route = createFileRoute('/venues_/$venueId')({
  validateSearch: venueSearchSchema,
  component: VenueRoute
})

function VenueRoute(): React.JSX.Element {
  const { venueId } = Route.useParams()
  const { competition, team, season, date } = Route.useSearch()
  return (
    <VenuePage
      season={season}
      date={date}
      competitionId={competition}
      teamId={team}
      venueId={venueId}
    />
  )
}

function positiveIdSearch(): z.ZodType<number | undefined> {
  return z.preprocess((value) => {
    const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
  }, z.number().int().positive().optional())
}
