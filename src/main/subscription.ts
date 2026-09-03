import { z } from 'zod'
import type { SubscriptionRefresh } from '@shared/contracts'
import { requestSportmonks } from './sportmonks-client'

const resourcesSchema = z.object({
  data: z.array(z.object({ id: z.number().int(), description: z.string() })),
  subscription: z
    .array(
      z.object({
        plans: z.array(z.object({ plan: z.string(), sport: z.string(), category: z.string() })),
        add_ons: z.array(z.object({ add_on: z.string(), sport: z.string() }))
      })
    )
    .default([])
})
const enrichmentsSchema = z.object({
  data: z.array(z.object({ id: z.number().int(), name: z.string() }))
})

export async function fetchSubscription(
  token: string,
  fetcher: typeof fetch = fetch
): Promise<SubscriptionRefresh> {
  const fetchedAt = Date.now()
  const resources = await requestSportmonks(
    new URL('https://api.sportmonks.com/v3/my/resources'),
    token,
    resourcesSchema,
    fetcher
  )
  const enrichments = await requestSportmonks(
    new URL('https://api.sportmonks.com/v3/my/enrichments'),
    token,
    enrichmentsSchema,
    fetcher
  )
  return {
    resources: resources.data,
    enrichments: enrichments.data,
    plans: resources.subscription
      .flatMap((subscription) => subscription.plans)
      .filter((plan) => plan.sport === 'Football')
      .map((plan) => ({ name: plan.plan, category: plan.category })),
    addOns: [
      ...new Set(
        resources.subscription
          .flatMap((subscription) => subscription.add_ons)
          .filter((addOn) => addOn.sport === 'Football')
          .map((addOn) => addOn.add_on)
      )
    ],
    fetchedAt
  }
}
