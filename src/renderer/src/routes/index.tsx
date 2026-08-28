import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { FixturesPage } from '@/features/fixtures/fixtures-page'
import { currentTimeZone, isIsoDate, todayInTimeZone } from '@/lib/date'

const defaultDate = todayInTimeZone(currentTimeZone())
const fixtureSearchSchema = z.object({
  date: z.string().refine(isIsoDate).catch(defaultDate).default(defaultDate),
  competition: z.preprocess((value) => {
    const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
  }, z.number().int().positive().optional())
})

export const Route = createFileRoute('/')({
  validateSearch: fixtureSearchSchema,
  component: FixtureRoute
})

function FixtureRoute(): React.JSX.Element {
  const { competition, date } = Route.useSearch()
  return <FixturesPage competitionId={competition} date={date} />
}
