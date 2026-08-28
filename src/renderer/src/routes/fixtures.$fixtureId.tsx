import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { FixtureDetailPage } from '@/features/fixtures/fixture-detail-page'
import { isIsoDate } from '@/lib/date'

const fixtureDetailSearchSchema = z.object({
  date: z.string().refine(isIsoDate).optional().catch(undefined),
  competition: z.preprocess((value) => {
    const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
  }, z.number().int().positive().optional())
})

export const Route = createFileRoute('/fixtures/$fixtureId')({
  validateSearch: fixtureDetailSearchSchema,
  component: FixtureDetailRoute
})

function FixtureDetailRoute(): React.JSX.Element {
  const { fixtureId } = Route.useParams()
  const { competition, date } = Route.useSearch()
  return <FixtureDetailPage competitionId={competition} date={date} fixtureId={fixtureId} />
}
