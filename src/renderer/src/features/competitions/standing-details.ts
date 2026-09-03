import type { SportmonksStandingDetail, SportmonksStandingForm } from '@shared/contracts'

const formResults = new Set(['W', 'D', 'L'])

export function standingDetailValue(
  details: readonly SportmonksStandingDetail[] | undefined,
  typeId: number
): number | null {
  return details?.find((detail) => detail.type_id === typeId)?.value ?? null
}

export function recentStandingForm(
  form: readonly SportmonksStandingForm[] | undefined
): SportmonksStandingForm[] {
  return (form ?? [])
    .filter((result) => formResults.has(result.form))
    .toSorted((left, right) => left.sort_order - right.sort_order)
    .slice(-5)
}
