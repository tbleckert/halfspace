import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { TransfersPage } from '@/features/transfers/transfers-page'
import { isIsoDate } from '@/lib/date'

export const Route = createFileRoute('/transfers')({
  validateSearch: z.object({
    start: z.string().refine(isIsoDate).optional().catch(undefined),
    end: z.string().refine(isIsoDate).optional().catch(undefined),
    page: z.coerce.number().int().positive().optional().catch(undefined),
    filter: z.string().max(100).optional().catch(undefined),
    status: z.enum(['all', 'completed', 'pending']).optional().catch(undefined)
  }),
  component: TransferRoute
})

function TransferRoute(): React.JSX.Element {
  return <TransfersPage {...Route.useSearch()} />
}
