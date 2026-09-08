import type { SportmonksFixture } from '@shared/contracts'
import { RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/error-alert'
import { featureAccess } from '@/features/subscription/subscription-access'
import { useSubscription } from '@/features/subscription/use-subscription'
import { fixtureParticipantAt } from '@/lib/fixture'
import type { FixturePlayerContext } from './fixture-route'
import { FixtureLineups } from './fixture-lineups'
import { usePredictedLineups } from './use-predicted-lineups'
import { useExpectedLineups } from './use-expected-lineups'

export function FixtureLineupView({
  fixture,
  online,
  context,
  source,
  onSelectSource
}: {
  fixture: SportmonksFixture
  online: boolean
  context: FixturePlayerContext
  source?: 'expected' | 'predicted'
  onSelectSource: (source: 'expected' | 'predicted') => void
}): React.JSX.Element {
  const confirmed = (fixture.lineups?.length ?? 0) > 0
  const beforeKickoff = fixture.state_id === 1
  const subscription = useSubscription(online && beforeKickoff && !confirmed)
  const expectedAccess = featureAccess(subscription.cached, 'expected-lineups')
  const predictedAccess = featureAccess(subscription.cached, 'predicted')
  const selected = source ?? (expectedAccess === 'included' ? 'expected' : 'predicted')
  const expected = useExpectedLineups(
    fixture.id,
    online &&
      beforeKickoff &&
      !confirmed &&
      selected === 'expected' &&
      expectedAccess !== 'not-included'
  )
  const predicted = usePredictedLineups(
    fixture.id,
    online &&
      beforeKickoff &&
      !confirmed &&
      selected === 'predicted' &&
      predictedAccess !== 'not-included'
  )
  const props = {
    home: fixtureParticipantAt(fixture, 'home'),
    away: fixtureParticipantAt(fixture, 'away'),
    online,
    context
  }
  if (confirmed || !beforeKickoff)
    return (
      <FixtureLineups
        {...props}
        lineups={fixture.lineups ?? []}
        events={fixture.events ?? []}
        formations={fixture.formations?.filter(({ fixture_id }) => fixture_id === fixture.id)}
      />
    )
  const query = selected === 'expected' ? expected : predicted
  const access = selected === 'expected' ? expectedAccess : predictedAccess
  const label = selected === 'expected' ? 'Expected lineups' : 'Predicted lineups'
  return (
    <section className="flex flex-col gap-3" aria-label={label}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{label}</h2>
          <p className="text-xs text-muted-foreground">Not confirmed team sheets</p>
        </div>
        <div className="flex items-center gap-2">
          <NativeSelect
            aria-label="Lineup forecast"
            value={selected}
            onChange={(event) => onSelectSource(event.target.value as 'expected' | 'predicted')}
          >
            <option value="expected">Expected squad</option>
            <option value="predicted">Predicted XI</option>
          </NativeSelect>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Refresh ${label.toLowerCase()}`}
            disabled={!online || query.refreshing || access === 'not-included'}
            onClick={() => void query.refresh()}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </div>
      {query.error && <ErrorAlert>{query.error}</ErrorAlert>}
      {query.cached?.lineups.length ? (
        <FixtureLineups {...props} lineups={query.cached.lineups} events={[]} kind={selected} />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {access === 'not-included'
              ? `${label} are not included in your subscription.`
              : query.cached
                ? `No ${label.toLowerCase()} reported for this match.`
                : query.error
                  ? `${label} unavailable.`
                  : !online
                    ? `${label} not available offline.`
                    : `Loading ${label.toLowerCase()}…`}
          </CardContent>
        </Card>
      )}
    </section>
  )
}
