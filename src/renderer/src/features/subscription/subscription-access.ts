import type { SubscriptionRefresh } from '@shared/contracts'

export const subscriptionFeatures = [
  { key: 'fixtures', name: 'Fixtures & live scores', resourceId: 142 },
  { key: 'squads', name: 'Teams & squads', resourceId: 181 },
  { key: 'statistics', name: 'Season statistics', resourceId: 241 },
  { key: 'tv', name: 'TV guide', resourceId: 142, enrichmentId: 96 },
  { key: 'predicted', name: 'Predicted lineups', resourceId: 142, enrichmentId: 157 },
  { key: 'news', name: 'Pre-match news', resourceId: 168 },
  { key: 'reports', name: 'Match reports', resourceId: 171 },
  { key: 'facts', name: 'Match facts', resourceId: 290 },
  { key: 'pressure', name: 'Pressure Index', resourceId: 142, enrichmentId: 138 },
  { key: 'totw', name: 'Team of the Week', resourceId: 263 },
  { key: 'prematch', name: 'Pre-match odds', resourceId: 123 },
  { key: 'inplay', name: 'In-play odds', resourceId: 127 }
] as const

export function featureAccess(
  subscription: SubscriptionRefresh | null | undefined,
  key: (typeof subscriptionFeatures)[number]['key']
): 'included' | 'not-included' | 'unknown' {
  if (!subscription) return 'unknown'
  const feature = subscriptionFeatures.find((feature) => feature.key === key)!
  const resourceIncluded = subscription.resources.some(
    (resource) => resource.id === feature.resourceId
  )
  const enrichmentIncluded =
    !('enrichmentId' in feature) ||
    subscription.enrichments.some((enrichment) => enrichment.id === feature.enrichmentId)
  return resourceIncluded && enrichmentIncluded ? 'included' : 'not-included'
}
