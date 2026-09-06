import type { SportmonksPlayerRegistration } from '@shared/contracts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TransferTeam } from '@/features/transfers/transfer-team'
import { formatTransferDate } from '@/features/transfers/transfer-display'

export function PlayerRegistrations({
  registrations,
  online,
  competitionId,
  season,
  date
}: {
  registrations: SportmonksPlayerRegistration[]
  online: boolean
  competitionId?: number
  season?: number
  date?: string
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrations</CardTitle>
      </CardHeader>
      <CardContent>
        {registrations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No registrations reported</p>
        ) : (
          <ul className="space-y-5">
            {registrations.map((registration) => (
              <li key={registration.id} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <TransferTeam
                    teamId={registration.team_id}
                    team={registration.team}
                    online={online}
                    competitionId={competitionId}
                    season={season}
                    date={date}
                  />
                  {registration.jersey_number !== null && (
                    <span
                      aria-label={`Shirt number ${registration.jersey_number}`}
                      className="font-mono text-sm tabular-nums"
                    >
                      #{registration.jersey_number}
                    </span>
                  )}
                </div>
                {(registration.start || registration.end || registration.captain) && (
                  <dl className="space-y-1 text-xs">
                    {registration.start && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">From</dt>
                        <dd>
                          <time dateTime={registration.start} className="font-mono tabular-nums">
                            {formatTransferDate(registration.start)}
                          </time>
                        </dd>
                      </div>
                    )}
                    {registration.end && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Until</dt>
                        <dd>
                          <time dateTime={registration.end} className="font-mono tabular-nums">
                            {formatTransferDate(registration.end)}
                          </time>
                        </dd>
                      </div>
                    )}
                    {registration.captain && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Role</dt>
                        <dd>Captain</dd>
                      </div>
                    )}
                  </dl>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
