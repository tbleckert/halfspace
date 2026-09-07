import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { FixturesPage } from '@/features/fixtures/fixtures-page'
import { currentTimeZone, isIsoDate, todayInTimeZone } from '@/lib/date'

export const Route = createFileRoute('/fixtures/')({
  validateSearch: z.object({
    date: z.preprocess(
      (value) => (isIsoDate(value) ? value : todayInTimeZone(currentTimeZone())),
      z.string()
    )
  }),
  component: FixtureBrowser
})
function FixtureBrowser(): React.JSX.Element {
  const { date } = Route.useSearch()
  return <FixturesPage date={date} />
}
