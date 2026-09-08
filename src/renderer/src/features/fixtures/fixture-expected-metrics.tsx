import type { SportmonksFixture } from '@shared/contracts'
import { RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/error-alert'
import { featureAccess } from '@/features/subscription/subscription-access'
import { useSubscription } from '@/features/subscription/use-subscription'
import { isFixtureOngoing } from '@/lib/fixture-state'
import { useExpectedMetrics } from './use-expected-metrics'
import { expectedMetricRows } from './fixture-analysis-data'
import { FixtureStatisticRow } from './fixture-statistic-row'
import { FixtureStatTeam } from './fixture-stat-team'
import { fixtureParticipantAt } from '@/lib/fixture'

export function FixtureExpectedMetrics({
  fixture,
  online
}: {
  fixture: SportmonksFixture
  online: boolean
}): React.JSX.Element {
  const subscription = useSubscription(online)
  const access = featureAccess(subscription.cached, 'xg')
  const query = useExpectedMetrics(
    fixture.id,
    online && access !== 'not-included',
    isFixtureOngoing(fixture.state_id)
  )
  const rows = expectedMetricRows(query.cached?.statistics ?? [])
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>Expected performance</CardTitle>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Refresh expected metrics"
          disabled={!online || query.refreshing || access === 'not-included'}
          onClick={() => void query.refresh()}
        >
          <RefreshCw className="size-4" />
        </Button>
      </CardHeader>
      {query.error && (
        <CardContent>
          <ErrorAlert>{query.error}</ErrorAlert>
        </CardContent>
      )}
      {rows.length ? (
        <div className="pb-2">
          <div className="grid grid-cols-2 gap-4 px-4 pb-2">
            <FixtureStatTeam
              participant={fixtureParticipantAt(fixture, 'home')}
              online={online}
              align="left"
            />
            <FixtureStatTeam
              participant={fixtureParticipantAt(fixture, 'away')}
              online={online}
              align="right"
            />
          </div>
          {rows.map((row) => (
            <FixtureStatisticRow key={row.id} row={row} />
          ))}
        </div>
      ) : (
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          {access === 'not-included'
            ? 'Expected goals are not included in your subscription.'
            : query.cached
              ? 'No expected metrics reported for this match.'
              : query.error
                ? 'Expected metrics unavailable.'
                : !online
                  ? 'Expected metrics not available offline.'
                  : 'Loading expected metrics…'}
        </CardContent>
      )}
    </Card>
  )
}
