import { Link } from '@tanstack/react-router'
import type { ViewBlock, FixtureSourceBlock } from '@shared/views'
import type { CachedFixture } from '@/data/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useFixtureOdds } from '@/features/fixtures/use-fixtures'
import { availablePrice, oddsComparison, oddsQuoteTime } from '@/features/fixtures/odds-comparison'
import { useSubscription } from '@/features/subscription/use-subscription'
import { featureAccess } from '@/features/subscription/subscription-access'
import { BlockError } from './view-block-state'
import { LinkedMatchView } from './linked-match-view'

type OddsBlock = Extract<ViewBlock, { type: 'odds-comparison' }>
export function OddsViewBlockContent({
  block,
  source,
  onChange
}: {
  block: OddsBlock
  source: FixtureSourceBlock
  onChange: (block: ViewBlock) => void
}): React.JSX.Element {
  return (
    <LinkedMatchView block={block} source={source}>
      {(fixture, online) => (
        <Prices
          key={fixture.id}
          block={block}
          fixture={fixture}
          online={online}
          defaultMarketId={source.type === 'market-shortlist' ? 1 : undefined}
          onChange={onChange}
        />
      )}
    </LinkedMatchView>
  )
}
function Prices({
  block,
  fixture,
  online,
  onChange,
  defaultMarketId
}: {
  defaultMarketId?: number
  block: OddsBlock
  fixture: CachedFixture
  online: boolean
  onChange: (block: ViewBlock) => void
}): React.JSX.Element {
  const subscription = useSubscription(online)
  const access = featureAccess(subscription.cached, 'prematch')
  const query = useFixtureOdds(fixture.id, online && access !== 'not-included', 'pre-match', false)
  const odds =
    query.cached?.odds
      .filter((quote) => quote.fixtureId === fixture.id)
      .map((quote) => quote.raw) ?? []
  const markets = [
    ...new Map(
      odds.map((quote) => [quote.market_id, quote.market?.name ?? `Market ${quote.market_id}`])
    ).entries()
  ]
  const marketId =
    block.marketId ?? defaultMarketId ?? (markets.some(([id]) => id === 1) ? 1 : markets[0]?.[0])
  const all = oddsComparison(odds, marketId ?? 0)
  const comparison = oddsComparison(odds, marketId ?? 0, block.bookmakerId ?? undefined)
  const fetchedAt = query.cached?.query?.fetchedAt
  const marketOptions = [
    {
      value: 'auto',
      label: marketId
        ? `Auto · ${markets.find(([id]) => id === marketId)?.[1] ?? `Market ${marketId}`}`
        : 'Automatic market'
    },
    ...(block.marketId !== null && !markets.some(([id]) => id === block.marketId)
      ? [{ value: String(block.marketId), label: <>Market {block.marketId} · Unavailable</> }]
      : []),
    ...markets.map(([id, name]) => ({ value: String(id), label: name }))
  ]
  const bookmakerOptions = [
    { value: 'all', label: 'All bookmakers' },
    ...(block.bookmakerId !== null && !all.bookmakers.some(({ id }) => id === block.bookmakerId)
      ? [
          {
            value: String(block.bookmakerId),
            label: <>Bookmaker {block.bookmakerId} · Unavailable</>
          }
        ]
      : []),
    ...all.bookmakers.map(({ id, name }) => ({ value: String(id), label: name }))
  ]
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Odds comparison</CardTitle>
        <Link
          to="/fixtures/$fixtureId/odds"
          params={{ fixtureId: String(fixture.id) }}
          search={{
            competition: fixture.leagueId,
            season: fixture.seasonId,
            oddsFeed: 'pre-match',
            market: marketId,
            bookmaker: block.bookmakerId ?? undefined
          }}
          className="text-sm font-medium hover:text-primary wrap-anywhere"
        >
          {fixture.name ??
            fixture.raw.participants?.map((team) => team.name).join(' vs ') ??
            'Next match'}
        </Link>
        <p className="text-xs text-muted-foreground">Pre-match · Decimal prices</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-6 @min-[520px]/view-widget:grid-cols-2">
          <Select
            items={marketOptions}
            value={String(block.marketId ?? 'auto')}
            onValueChange={(value) => {
              if (value === null) return
              onChange({
                ...block,
                marketId: value === 'auto' ? null : Number(value)
              })
            }}
          >
            <SelectTrigger className="w-full min-w-0" aria-label="Odds market">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {marketOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            items={bookmakerOptions}
            value={String(block.bookmakerId ?? 'all')}
            onValueChange={(value) => {
              if (value === null) return
              onChange({
                ...block,
                bookmakerId: value === 'all' ? null : Number(value)
              })
            }}
          >
            <SelectTrigger className="w-full min-w-0" aria-label="Odds bookmaker">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {bookmakerOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <BlockError error={query.error} online={online} refresh={query.refresh} />
        {access === 'not-included' && (
          <p className="text-sm text-muted-foreground">
            Pre-match odds are not included in your Sportmonks plan.{' '}
            <Link to="/settings" className="underline">
              View subscription
            </Link>
          </p>
        )}
        {comparison.rows.length ? (
          <div className="grid gap-6 @min-[520px]/view-widget:grid-cols-2 @min-[860px]/view-widget:grid-cols-3">
            {comparison.rows.map((row) => (
              <section key={row.key} className="min-w-0">
                <h4 className="text-sm font-semibold wrap-anywhere">{row.label}</h4>
                {row.detail && (
                  <p className="mt-1 text-xs text-muted-foreground wrap-anywhere">{row.detail}</p>
                )}
                <ul className="mt-3 space-y-3">
                  {comparison.bookmakers.map((bookmaker) => {
                    const quote = row.quotes.get(bookmaker.id)
                    const time = quote ? oddsQuoteTime(quote) : null
                    return (
                      <li
                        key={bookmaker.id}
                        className="flex items-start justify-between gap-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="wrap-anywhere">{bookmaker.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {quote
                              ? quote.stopped
                                ? 'Stopped'
                                : quote.suspended
                                  ? 'Suspended'
                                  : time === null
                                    ? 'Quote time unknown'
                                    : new Date(time).toLocaleString()
                              : 'No quote'}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-sm px-1.5 py-0.5 font-mono tabular-nums ${quote && availablePrice(quote) === row.highest && row.highest !== null && comparison.bookmakers.length > 1 ? 'bg-success-subtle text-success-foreground' : ''} ${quote?.stopped || quote?.suspended ? 'text-muted-foreground line-through' : ''}`}
                        >
                          {quote?.value ?? '—'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          access !== 'not-included' && (
            <p role="status" className="text-sm text-muted-foreground">
              {fetchedAt
                ? 'No odds for this selection.'
                : query.error
                  ? 'Odds unavailable.'
                  : online
                    ? 'Loading odds…'
                    : 'Odds not cached for offline use.'}
            </p>
          )
        )}
        {fetchedAt !== undefined && (
          <p className="text-xs text-muted-foreground">
            Fetched{' '}
            <span className="font-mono tabular-nums">{new Date(fetchedAt).toLocaleString()}</span>
            {!online && ' · Offline'}. Highest available listed prices are highlighted.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
