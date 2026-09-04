import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { BroadcasterPage } from '@/features/broadcasts/broadcaster-page'

const positiveId = z.coerce.number().int().positive().optional().catch(undefined)

export const Route = createFileRoute('/broadcasters_/$stationId')({
  validateSearch: z.object({
    feed: z.enum(['upcoming', 'past']).optional().catch(undefined),
    page: positiveId,
    fixture: positiveId,
    competition: positiveId,
    season: positiveId
  }),
  component: BroadcasterRoute
})

function BroadcasterRoute(): React.JSX.Element {
  const { stationId } = Route.useParams()
  const search = Route.useSearch()
  const parsedId = Number(stationId)
  if (!Number.isSafeInteger(parsedId) || parsedId <= 0)
    return <p className="p-7 text-sm text-muted-foreground">Broadcaster not found</p>
  return <BroadcasterPage stationId={parsedId} {...search} />
}
