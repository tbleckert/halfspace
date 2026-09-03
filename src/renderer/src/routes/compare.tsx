import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ComparisonPage } from '@/features/comparisons/comparison-page'

const optionalId = z.coerce.number().int().positive().optional().catch(undefined)
export const Route = createFileRoute('/compare')({
  validateSearch: z.object({
    kind: z.enum(['teams', 'players']).optional().catch(undefined),
    leftSeason: optionalId,
    rightSeason: optionalId,
    left: optionalId,
    right: optionalId,
    leftTeam: optionalId,
    rightTeam: optionalId
  }),
  component: ComparisonRoute
})

function ComparisonRoute(): React.JSX.Element {
  return <ComparisonPage {...Route.useSearch()} />
}
