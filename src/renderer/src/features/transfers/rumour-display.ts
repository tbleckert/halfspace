import type { SportmonksTransferRumour } from '@shared/transfer-rumours'

export function rumourSourceUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

export function rumourAmount(
  rumour: Pick<SportmonksTransferRumour, 'amount' | 'currency'>
): string | null {
  if (
    rumour.amount === null ||
    !Number.isFinite(rumour.amount) ||
    !rumour.currency ||
    !/^[A-Z]{3}$/.test(rumour.currency)
  )
    return null
  return `${rumour.amount.toLocaleString()} ${rumour.currency}`
}
