import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { isIsoDate } from '@/lib/date'
import { TvGuidePage } from '@/features/broadcasts/tv-guide-page'

export const Route = createFileRoute('/tv-guide')({
  validateSearch: z.object({ date: z.string().refine(isIsoDate).optional().catch(undefined) }),
  component: TvGuideRoute
})
function TvGuideRoute(): React.JSX.Element {
  return <TvGuidePage {...Route.useSearch()} />
}
