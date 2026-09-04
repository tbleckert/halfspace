import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { NewsPage } from '@/features/news/news-page'
export const Route = createFileRoute('/news')({
  validateSearch: z.object({
    feed: z.enum(['pre-match', 'post-match']).optional().catch(undefined),
    page: z.coerce.number().int().min(1).max(10000).optional().catch(undefined),
    competition: z.coerce.number().int().positive().optional().catch(undefined),
    season: z.coerce.number().int().positive().optional().catch(undefined)
  }),
  component: NewsRoute
})
function NewsRoute(): React.JSX.Element {
  return <NewsPage {...Route.useSearch()} />
}
