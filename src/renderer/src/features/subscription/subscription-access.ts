import type { SubscriptionRefresh } from '@shared/contracts'

export const subscriptionFeatures = [
  { key: 'live-tables', name: 'Live league tables', resourceIds: [223] },
  { key: 'trends', name: 'Match trends', resourceIds: [142], enrichmentId: 100 },
  {
    key: 'broadcasts',
    name: 'Broadcaster schedules',
    resourceIds: [235, 239, 240],
    enrichmentId: 96
  },
  { key: 'fixtures', name: 'Fixtures & live scores', resourceIds: [142] },
  { key: 'squads', name: 'Teams & squads', resourceIds: [181] },
  { key: 'statistics', name: 'Season statistics', resourceIds: [241] },
  { key: 'tv', name: 'TV guide', resourceIds: [142], enrichmentId: 96 },
  { key: 'predicted', name: 'Predicted lineups', resourceIds: [142], enrichmentId: 157 },
  { key: 'news', name: 'Pre-match news', resourceIds: [168] },
  { key: 'reports', name: 'Match reports', resourceIds: [171] },
  { key: 'facts', name: 'Match facts', resourceIds: [290] },
  { key: 'pressure', name: 'Pressure Index', resourceIds: [142], enrichmentId: 138 },
  { key: 'totw', name: 'Team of the Week', resourceIds: [263] },
  { key: 'prematch', name: 'Pre-match odds', resourceIds: [123] },
  { key: 'inplay', name: 'In-play odds', resourceIds: [127] }
] as const

export function featureAccess(
  subscription: SubscriptionRefresh | null | undefined,
  key: (typeof subscriptionFeatures)[number]['key']
): 'included' | 'not-included' | 'unknown' {
  if (!subscription) return 'unknown'
  const feature = subscriptionFeatures.find((feature) => feature.key === key)!
  const resourceIncluded = feature.resourceIds.every((id) =>
    subscription.resources.some((resource) => resource.id === id)
  )
  const enrichmentIncluded =
    !('enrichmentId' in feature) ||
    subscription.enrichments.some((enrichment) => enrichment.id === feature.enrichmentId)
  return resourceIncluded && enrichmentIncluded ? 'included' : 'not-included'
}
