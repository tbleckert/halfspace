import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CompetitionWorkspacePage } from '@/features/competitions/competition-workspace-page'
import { currentTimeZone, isIsoDate, todayInTimeZone } from '@/lib/date'

const defaultDate = todayInTimeZone(currentTimeZone())
const competitionFixturesSearchSchema = z.object({
  date: z.string().refine(isIsoDate).catch(defaultDate).default(defaultDate)
})

export const Route = createFileRoute('/competitions_/$competitionId_/fixtures')({
  validateSearch: competitionFixturesSearchSchema,
  component: CompetitionFixturesRoute
})

function CompetitionFixturesRoute(): React.JSX.Element {
  const { competitionId } = Route.useParams()
  const { date } = Route.useSearch()

  return <CompetitionWorkspacePage competitionId={competitionId} date={date} view="fixtures" />
}
