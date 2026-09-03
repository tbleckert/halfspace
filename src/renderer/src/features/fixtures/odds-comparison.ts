import type { SportmonksOdd } from '@shared/contracts'

export interface OddsComparisonRow {
  key: string
  label: string
  detail: string
  quotes: Map<number, SportmonksOdd>
  highest: number | null
}

export function oddsQuoteTime(quote: SportmonksOdd): number | null {
  const value = quote.latest_bookmaker_update
  if (!value) return null
  const timestamp = Date.parse(
    /^\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d$/.test(value) ? `${value.replace(' ', 'T')}Z` : value
  )
  return Number.isFinite(timestamp) ? timestamp : null
}

export function availablePrice(quote: SportmonksOdd): number | null {
  const value = Number(quote.value)
  return !quote.stopped && !quote.suspended && Number.isFinite(value) && value > 1 ? value : null
}

export function oddsComparison(
  odds: SportmonksOdd[],
  marketId: number,
  bookmakerId?: number
): {
  bookmakers: { id: number; name: string }[]
  rows: OddsComparisonRow[]
} {
  const bookmakers = new Map<number, { id: number; name: string }>()
  const rows = new Map<string, OddsComparisonRow>()
  for (const quote of odds) {
    if (
      quote.market_id !== marketId ||
      (bookmakerId !== undefined && quote.bookmaker_id !== bookmakerId)
    )
      continue
    bookmakers.set(quote.bookmaker_id, {
      id: quote.bookmaker_id,
      name: quote.bookmaker?.name ?? `Bookmaker ${quote.bookmaker_id}`
    })
    const label =
      marketId === 1
        ? resultLabel(quote.label)
        : [quote.name, quote.label]
            .filter((part, index, parts) => part && parts.indexOf(part) === index)
            .join(' · ')
    const description = marketDescription(quote)
    const key = JSON.stringify([
      marketId,
      label,
      description,
      quote.total ?? '',
      quote.handicap ?? '',
      marketId === 1 ? '' : (quote.participants ?? '')
    ])
    const row = rows.get(key) ?? {
      key,
      label,
      detail: [
        quote.total ? `Total ${quote.total}` : null,
        quote.handicap ? `Handicap ${quote.handicap}` : null,
        description
      ]
        .filter(Boolean)
        .join(' · '),
      quotes: new Map<number, SportmonksOdd>(),
      highest: null
    }
    const previous = row.quotes.get(quote.bookmaker_id)
    const time = oddsQuoteTime(quote) ?? -Infinity
    const previousTime = previous ? (oddsQuoteTime(previous) ?? -Infinity) : -Infinity
    if (!previous || time > previousTime || (time === previousTime && quote.id > previous.id))
      row.quotes.set(quote.bookmaker_id, quote)
    rows.set(key, row)
  }
  for (const row of rows.values()) {
    const prices = [...row.quotes.values()].flatMap((quote) => availablePrice(quote) ?? [])
    row.highest = prices.length > 0 ? Math.max(...prices) : null
  }
  return {
    bookmakers: [...bookmakers.values()].sort((left, right) => left.name.localeCompare(right.name)),
    rows: [...rows.values()].sort(
      (left, right) =>
        (marketId === 1 ? resultOrder(left.label) - resultOrder(right.label) : 0) ||
        left.label.localeCompare(right.label, undefined, { numeric: true }) ||
        left.detail.localeCompare(right.detail, undefined, { numeric: true })
    )
  }
}

function resultOrder(label: string): number {
  const order = ['Home', 'Draw', 'Away'].indexOf(label)
  return order < 0 ? 3 : order
}

function marketDescription(quote: SportmonksOdd): string {
  const description = quote.market_description ?? ''
  if (
    quote.market_id === 1 &&
    ['fulltimeresult', 'matchwinner'].includes(description.toLowerCase().replace(/\s/g, ''))
  )
    return ''
  return description
}

function resultLabel(label: string): string {
  switch (label.toLowerCase()) {
    case '1':
    case 'home':
      return 'Home'
    case 'x':
    case 'draw':
      return 'Draw'
    case '2':
    case 'away':
      return 'Away'
    default:
      return label
  }
}
