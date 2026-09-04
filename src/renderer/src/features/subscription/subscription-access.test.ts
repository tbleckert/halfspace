import { describe, expect, it } from 'vitest'
import type { SubscriptionRefresh } from '@shared/contracts'
import { featureAccess } from './subscription-access'

const subscription: SubscriptionRefresh = {
  plans: [],
  addOns: [],
  fetchedAt: 1,
  resources: [
    { id: 142, description: 'Fixture By Id' },
    { id: 123, description: 'Prematch Odds By Fixture Id' }
  ],
  enrichments: [{ id: 96, name: 'Access tv Stations' }]
}

describe('feature access', () => {
  it('does not confuse unverified access with an upgrade requirement', () => {
    expect(featureAccess(null, 'tv')).toBe('unknown')
  })
  it('checks the resource and relationship actually used by the feature', () => {
    expect(featureAccess(subscription, 'tv')).toBe('included')
    expect(featureAccess({ ...subscription, enrichments: [] }, 'tv')).toBe('not-included')
  })
  it('distinguishes pre-match access from in-play access', () => {
    expect(featureAccess(subscription, 'prematch')).toBe('included')
    expect(featureAccess(subscription, 'inplay')).toBe('not-included')
  })
  it('requires broadcaster identity and both schedule feeds', () => {
    const broadcasts = {
      ...subscription,
      resources: [235, 239, 240].map((id) => ({ id, description: 'TV station resource' }))
    }
    expect(featureAccess(broadcasts, 'broadcasts')).toBe('included')
    for (const missingId of [235, 239, 240]) {
      expect(
        featureAccess(
          { ...broadcasts, resources: broadcasts.resources.filter(({ id }) => id !== missingId) },
          'broadcasts'
        )
      ).toBe('not-included')
    }
  })
  it('requires fixture access and the pressure enrichment, not a plan name', () => {
    const pressure = { ...subscription, enrichments: [{ id: 138, name: 'Access Pressure Index' }] }
    expect(featureAccess(pressure, 'pressure')).toBe('included')
    expect(featureAccess({ ...pressure, resources: [] }, 'pressure')).toBe('not-included')
    expect(featureAccess(subscription, 'pressure')).toBe('not-included')
    expect(featureAccess(null, 'pressure')).toBe('unknown')
  })
})
