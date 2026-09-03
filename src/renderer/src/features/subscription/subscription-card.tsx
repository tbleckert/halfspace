import { RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/error-alert'
import { useOnline } from '@/lib/use-online'
import { featureAccess, subscriptionFeatures } from './subscription-access'
import { useSubscription } from './use-subscription'

export function SubscriptionCard(): React.JSX.Element {
  const online = useOnline()
  const subscription = useSubscription(online)
  const cached = subscription.cached

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Your plan</CardTitle>
        <Button
          aria-label="Refresh subscription"
          variant="ghost"
          size="icon"
          disabled={!online || subscription.refreshing}
          onClick={() => void subscription.refresh()}
        >
          <RefreshCw className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {subscription.error && <ErrorAlert>{subscription.error}</ErrorAlert>}
        {!cached ? (
          <p className="text-sm text-muted-foreground">
            {online
              ? subscription.error
                ? 'Subscription access not verified.'
                : 'Checking subscription…'
              : 'Subscription access not available offline.'}
          </p>
        ) : (
          <>
            <div>
              <p className="font-medium">
                {cached.plans.map((plan) => plan.name).join(' · ') || 'Sportmonks Football'}
              </p>
              {cached.addOns.length > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">{cached.addOns.join(' · ')}</p>
              )}
            </div>
            <dl className="divide-y border-y">
              {subscriptionFeatures.map((feature) => {
                const included = featureAccess(cached, feature.key) === 'included'
                return (
                  <div key={feature.key} className="flex justify-between gap-4 py-2.5 text-sm">
                    <dt>{feature.name}</dt>
                    <dd className={included ? 'text-success-foreground' : 'text-muted-foreground'}>
                      {included ? 'Included' : 'Not included'}
                    </dd>
                  </div>
                )
              })}
            </dl>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Data coverage varies by competition and fixture.</p>
              <p>
                Checked {new Date(cached.fetchedAt).toLocaleString()}
                {!online ? ' · Offline' : ''}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
