import { createFileRoute } from '@tanstack/react-router'
import { ViewsPage } from '@/features/views/views-page'

export const Route = createFileRoute('/views')({
  validateSearch: (search: Record<string, unknown>): { view?: string } => ({
    view: typeof search.view === 'string' ? search.view : undefined
  }),
  component: ViewsRoute
})

function ViewsRoute(): React.JSX.Element {
  const { view } = Route.useSearch()
  return <ViewsPage viewId={view} />
}
