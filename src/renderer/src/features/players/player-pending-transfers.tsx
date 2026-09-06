import type { SportmonksTransfer } from '@shared/contracts'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TransferTeam } from '@/features/transfers/transfer-team'
import { formatTransferDate } from '@/features/transfers/transfer-display'

export function PlayerPendingTransfers({
  transfers,
  online,
  competitionId,
  season,
  date
}: {
  transfers: SportmonksTransfer[] | undefined
  online: boolean
  competitionId?: number
  season?: number
  date?: string
}): React.JSX.Element {
  const pending = transfers
    ?.filter(({ completed }) => !completed)
    .toSorted((a, b) => a.date.localeCompare(b.date))
  const context = { online, competitionId, season, date }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending transfers</CardTitle>
      </CardHeader>
      <CardContent>
        {!pending?.length ? (
          <p className="text-sm text-muted-foreground">
            {pending ? 'No pending transfers reported' : 'Pending transfers not available'}
          </p>
        ) : (
          <ul className="space-y-5">
            {pending.map((transfer) => (
              <li key={transfer.id} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{transfer.type?.name ?? 'Transfer'} · Pending</span>
                  <time className="font-mono tabular-nums" dateTime={transfer.date}>
                    {formatTransferDate(transfer.date)}
                  </time>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                  <TransferTeam
                    {...context}
                    teamId={transfer.from_team_id}
                    team={transfer.fromTeam}
                  />
                  <ArrowRight aria-label="To" className="size-4 text-muted-foreground" />
                  <TransferTeam {...context} teamId={transfer.to_team_id} team={transfer.toTeam} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
