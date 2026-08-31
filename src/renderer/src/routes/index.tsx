import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { FixturesPage } from '@/features/fixtures/fixtures-page'
import { currentTimeZone, isIsoDate, todayInTimeZone } from '@/lib/date'

const fixtureSearchSchema = z.object({
  date: z.preprocess(
    (value) => (isIsoDate(value) ? value : todayInTimeZone(currentTimeZone())),
    z.string()
  )
})

export const Route = createFileRoute('/')({
  validateSearch: fixtureSearchSchema,
  component: FixtureRoute
})

function FixtureRoute(): React.JSX.Element {
  const { date } = Route.useSearch()
  return <FixturesPage date={date} />
}
