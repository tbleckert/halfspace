import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { VenuePage } from '@/features/venues/venue-page'

const venueSearchSchema = z.object({
  competition: positiveIdSearch(),
  team: positiveIdSearch()
})

export const Route = createFileRoute('/venues_/$venueId')({
  validateSearch: venueSearchSchema,
  component: VenueRoute
})

function VenueRoute(): React.JSX.Element {
  const { venueId } = Route.useParams()
  const { competition, team } = Route.useSearch()
  return <VenuePage competitionId={competition} teamId={team} venueId={venueId} />
}

function positiveIdSearch(): z.ZodType<number | undefined> {
  return z.preprocess((value) => {
    const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
  }, z.number().int().positive().optional())
}
