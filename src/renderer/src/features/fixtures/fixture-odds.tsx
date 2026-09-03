import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { OddsFeed, SportmonksOdd } from '@shared/contracts'
import { availablePrice, oddsComparison, oddsQuoteTime } from './odds-comparison'
import { FixtureEmptyState } from './fixture-empty-state'

export function FixtureOdds({
  loading,
  odds,
  offline,
  feed,
  live,
  access,
  fetchedAt,
  marketId,
  bookmakerId,
  onSelect
}: {
  loading: boolean
  odds: SportmonksOdd[]
  offline: boolean
  feed: OddsFeed
  live: boolean
  access: 'unknown' | 'included' | 'not-included'
  fetchedAt?: number
  marketId?: number
  bookmakerId?: number
  onSelect: (selection: { oddsFeed: OddsFeed; market?: number; bookmaker?: number }) => void
}): React.JSX.Element {
  const markets = useMemo(
    () =>
      [
        ...new Map(
          odds.map((quote) => [
            quote.market_id,
            {
              id: quote.market_id,
              name: quote.market?.name ?? `Market ${quote.market_id}`
            }
          ])
        ).values()
      ].sort((left, right) => left.name.localeCompare(right.name)),
    [odds]
  )
  const selectedMarketId = marketId ?? (markets.some(({ id }) => id === 1) ? 1 : markets[0]?.id)
  const all = useMemo(() => oddsComparison(odds, selectedMarketId ?? 0), [odds, selectedMarketId])
  const comparison = useMemo(
    () =>
      bookmakerId === undefined ? all : oddsComparison(odds, selectedMarketId ?? 0, bookmakerId),
    [all, odds, selectedMarketId, bookmakerId]
  )

  return (
    <Card className="gap-0 overflow-hidden">
      <CardHeader className="gap-3 border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Odds</CardTitle>
          <div className="flex gap-1" aria-label="Odds feed">
            {(['pre-match', 'inplay'] as const).map((value) => (
              <Button
                key={value}
                aria-pressed={feed === value}
                variant={feed === value ? 'secondary' : 'ghost'}
                onClick={() => onSelect({ oddsFeed: value })}
              >
                {value === 'pre-match' ? 'Pre-match' : 'In-play'}
              </Button>
            ))}
          </div>
        </div>
        {markets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <NativeSelect
              aria-label="Odds market"
              value={selectedMarketId}
              onChange={(event) => onSelect({ oddsFeed: feed, market: Number(event.target.value) })}
            >
              {marketId !== undefined && !markets.some(({ id }) => id === marketId) && (
                <option value={marketId}>Market unavailable</option>
              )}
              {markets.map((market) => (
                <option key={market.id} value={market.id}>
                  {market.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label="Odds bookmaker"
              value={bookmakerId ?? 'all'}
              onChange={(event) =>
                onSelect({
                  oddsFeed: feed,
                  market: selectedMarketId,
                  bookmaker: event.target.value === 'all' ? undefined : Number(event.target.value)
                })
              }
            >
              <option value="all">All bookmakers</option>
              {bookmakerId !== undefined &&
                !all.bookmakers.some(({ id }) => id === bookmakerId) && (
                  <option value={bookmakerId}>Bookmaker unavailable</option>
                )}
              {all.bookmakers.map((bookmaker) => (
                <option key={bookmaker.id} value={bookmaker.id}>
                  {bookmaker.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
      </CardHeader>
      {access === 'not-included' && (
        <FixtureEmptyState>
          {feed === 'inplay' ? 'In-play' : 'Pre-match'} odds are not included in your Sportmonks
          plan.{' '}
          <Link to="/settings" className="text-foreground underline underline-offset-4">
            View subscription
          </Link>
        </FixtureEmptyState>
      )}
      {comparison.rows.length > 0 ? (
        <Table aria-label="Bookmaker odds comparison">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-card">Outcome</TableHead>
              {comparison.bookmakers.map((bookmaker) => (
                <TableHead key={bookmaker.id} className="text-right">
                  {bookmaker.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparison.rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="sticky left-0 z-10 bg-card">
                  <div className="font-medium">{row.label}</div>
                  {row.detail && (
                    <div className="mt-0.5 text-xs text-muted-foreground">{row.detail}</div>
                  )}
                </TableCell>
                {comparison.bookmakers.map((bookmaker) => {
                  const quote = row.quotes.get(bookmaker.id)
                  if (!quote)
                    return (
                      <TableCell key={bookmaker.id} className="text-right text-muted-foreground">
                        —
                      </TableCell>
                    )
                  const unavailable = quote.stopped || quote.suspended
                  const updatedAt = oddsQuoteTime(quote)
                  return (
                    <TableCell
                      key={bookmaker.id}
                      className="text-right"
                      title={
                        updatedAt === null
                          ? undefined
                          : `Provider updated ${new Date(updatedAt).toLocaleString()}`
                      }
                    >
                      <span
                        className={cn(
                          'inline-block rounded-sm px-2 py-1 font-mono font-semibold tabular-nums',
                          unavailable && 'text-muted-foreground line-through',
                          !unavailable &&
                            comparison.bookmakers.length > 1 &&
                            availablePrice(quote) !== null &&
                            availablePrice(quote) === row.highest &&
                            'bg-success-subtle text-success-foreground'
                        )}
                      >
                        {quote.value}
                      </span>
                      {unavailable && (
                        <div className="text-xs text-muted-foreground">
                          {quote.stopped ? 'Stopped' : 'Suspended'}
                        </div>
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        access !== 'not-included' && (
          <FixtureEmptyState>
            {loading
              ? 'Loading odds…'
              : offline && !fetchedAt
                ? 'Odds not available offline.'
                : !fetchedAt
                  ? 'Odds unavailable.'
                  : 'No odds for this selection.'}
          </FixtureEmptyState>
        )
      )}
      {fetchedAt !== undefined && (
        <div className="space-y-1 border-t px-4 py-3 text-xs text-muted-foreground">
          <div>
            {feed === 'pre-match'
              ? 'Pre-match quotes.'
              : live && !offline
                ? 'In-play quotes · refreshes every 30 seconds while open.'
                : 'Last available in-play quotes.'}{' '}
            {comparison.bookmakers.length > 1 && 'Highest listed prices are highlighted.'}
          </div>
          <div>
            Fetched{' '}
            <span className="font-mono tabular-nums">{new Date(fetchedAt).toLocaleString()}</span>
            {offline && ' · Offline'}
          </div>
        </div>
      )}
    </Card>
  )
}
