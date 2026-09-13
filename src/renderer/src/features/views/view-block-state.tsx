import type { ViewBlock } from '@shared/views'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorAlert } from '@/components/error-alert'
import { Button } from '@/components/ui/button'
import { viewBlockLabel } from './view-editing'

export function BlockPending({
  block,
  online,
  error,
  loading
}: {
  block: ViewBlock
  online: boolean
  error: string | null
  loading: boolean
}): React.JSX.Element {
  return (
    <Card aria-busy={loading && online && !error}>
      <CardHeader>
        <CardTitle>{viewBlockLabel(block)}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && online && !error && (
          <div aria-hidden="true" className="mb-4 space-y-3">
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        )}
        <p role="status" className="text-xs text-muted-foreground">
          {error
            ? 'Data unavailable'
            : !online
              ? 'Not cached for offline use'
              : loading
                ? 'Loading football data…'
                : 'Data unavailable'}
        </p>
      </CardContent>
    </Card>
  )
}
export function BlockEmpty({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <Card className="p-6 text-sm text-muted-foreground">{children}</Card>
}
export function BlockError({
  error,
  online,
  refresh
}: {
  error: string | null
  online: boolean
  refresh: () => Promise<void>
}): React.JSX.Element | null {
  return error ? (
    <ErrorAlert>
      <div className="flex items-center justify-between gap-2">
        <span>{error}</span>
        <Button size="sm" variant="ghost" disabled={!online} onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    </ErrorAlert>
  ) : null
}
