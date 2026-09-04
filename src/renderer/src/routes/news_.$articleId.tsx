import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { NewsArticlePage } from '@/features/news/news-article-page'
export const Route = createFileRoute('/news_/$articleId')({
  validateSearch: z.object({
    fixture: z.coerce.number().int().positive().optional().catch(undefined),
    competition: z.coerce.number().int().positive().optional().catch(undefined),
    season: z.coerce.number().int().positive().optional().catch(undefined)
  }),
  component: ArticleRoute
})
function ArticleRoute(): React.JSX.Element {
  return <NewsArticlePage {...Route.useParams()} {...Route.useSearch()} />
}
