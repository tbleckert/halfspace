import type { SportmonksFixture } from '@shared/contracts'
import { RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/error-alert'
import { featureAccess } from '@/features/subscription/subscription-access'
import { useSubscription } from '@/features/subscription/use-subscription'
import { fixtureParticipantAt } from '@/lib/fixture'
import { usePredictions } from './use-predictions'
import { predictionGroups, type PredictionOutcome } from './fixture-analysis-data'

export function FixturePredictions({
  fixture,
  online
}: {
  fixture: SportmonksFixture
  online: boolean
}): React.JSX.Element {
  const subscription = useSubscription(online)
  const access = featureAccess(subscription.cached, 'predictions')
  const query = usePredictions(fixture.id, online && access !== 'not-included')
  const groups = predictionGroups(
    query.cached?.predictions ?? [],
    fixtureParticipantAt(fixture, 'home')?.name ?? 'Home',
    fixtureParticipantAt(fixture, 'away')?.name ?? 'Away'
  )
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Predictions</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Pre-match probabilities</p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Refresh predictions"
          disabled={!online || query.refreshing || access === 'not-included'}
          onClick={() => void query.refresh()}
        >
          <RefreshCw className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {query.error && <ErrorAlert>{query.error}</ErrorAlert>}
        {groups.length ? (
          groups.map((group) => (
            <section key={group.id} aria-label={group.label}>
              <h3 className="mb-3 text-sm font-semibold">{group.label}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {(group.id === 240 ? group.outcomes.slice(0, 6) : group.outcomes).map((outcome) => (
                  <Outcome key={outcome.label} outcome={outcome} />
                ))}
              </div>
              {group.id === 240 && group.outcomes.length > 6 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-medium text-primary">
                    More score outcomes
                  </summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {group.outcomes.slice(6).map((outcome) => (
                      <Outcome key={outcome.label} outcome={outcome} />
                    ))}
                  </div>
                </details>
              )}
            </section>
          ))
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {access === 'not-included'
              ? 'Predictions are not included in your subscription.'
              : query.cached
                ? 'No predictions reported for this match.'
                : query.error
                  ? 'Predictions unavailable.'
                  : !online
                    ? 'Predictions not available offline.'
                    : 'Loading predictions…'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function Outcome({ outcome }: { outcome: PredictionOutcome }): React.JSX.Element {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{outcome.label}</span>
        <span className="font-mono font-semibold tabular-nums">
          {outcome.probability.toFixed(2)}%
        </span>
      </div>
      <div aria-hidden="true" className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-chart-2"
          style={{ width: `${outcome.probability}%` }}
        />
      </div>
    </div>
  )
}
