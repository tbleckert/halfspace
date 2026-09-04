import type { SportmonksFixture } from '@shared/contracts'
import { RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/error-alert'
import { featureAccess } from '@/features/subscription/subscription-access'
import { useSubscription } from '@/features/subscription/use-subscription'
import { fixtureParticipantAt } from '@/lib/fixture'
import type { FixturePlayerContext } from './fixture-route'
import { FixtureLineups } from './fixture-lineups'
import { usePredictedLineups } from './use-predicted-lineups'

export function FixtureLineupView({
  fixture,
  online,
  context
}: {
  fixture: SportmonksFixture
  online: boolean
  context: FixturePlayerContext
}): React.JSX.Element {
  const confirmed = (fixture.lineups?.length ?? 0) > 0
  const beforeKickoff = fixture.state_id === 1
  const subscription = useSubscription(online && beforeKickoff && !confirmed)
  const access = featureAccess(subscription.cached, 'predicted')
  const prediction = usePredictedLineups(
    fixture.id,
    online && beforeKickoff && !confirmed && access !== 'not-included'
  )
  const props = {
    home: fixtureParticipantAt(fixture, 'home'),
    away: fixtureParticipantAt(fixture, 'away'),
    online,
    context
  }
  if (confirmed || !beforeKickoff)
    return (
      <FixtureLineups {...props} lineups={fixture.lineups ?? []} events={fixture.events ?? []} />
    )
  if (access === 'not-included' && !prediction.cached)
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Confirmed lineups are not available yet. Predictions are not included in your
          subscription.
        </CardContent>
      </Card>
    )
  return (
    <section className="flex flex-col gap-3" aria-label="Predicted lineups">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Predicted lineups</h2>
          <p className="text-xs text-muted-foreground">Not confirmed team sheets</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Refresh predicted lineups"
          disabled={!online || prediction.refreshing}
          onClick={() => void prediction.refresh()}
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>
      {prediction.error && <ErrorAlert>{prediction.error}</ErrorAlert>}
      {prediction.cached?.lineups.length ? (
        <FixtureLineups {...props} lineups={prediction.cached.lineups} events={[]} predicted />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {prediction.cached
              ? 'No predicted lineups reported'
              : prediction.error
                ? 'Predicted lineups unavailable'
                : !online
                  ? 'Predicted lineups not available offline'
                  : 'Loading predicted lineups…'}
          </CardContent>
        </Card>
      )}
    </section>
  )
}
