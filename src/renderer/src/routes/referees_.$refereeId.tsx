import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { fixtureDetailSearchSchema } from '@/features/fixtures/fixture-route'
import { RefereePage } from '@/features/referees/referee-page'

export const Route = createFileRoute('/referees_/$refereeId')({
  validateSearch: fixtureDetailSearchSchema.extend({
    fixture: z.coerce.number().int().positive().optional().catch(undefined),
    statsSeason: z.coerce.number().int().positive().optional().catch(undefined)
  }),
  component: RefereeRoute
})

function RefereeRoute(): React.JSX.Element {
  const { refereeId } = Route.useParams()
  const { fixture, statsSeason, ...context } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <RefereePage
      refereeId={refereeId}
      fixtureId={fixture}
      context={context}
      statsSeason={statsSeason}
      onStatsSeasonChange={(seasonId) =>
        void navigate({ search: (previous) => ({ ...previous, statsSeason: seasonId }) })
      }
    />
  )
}
