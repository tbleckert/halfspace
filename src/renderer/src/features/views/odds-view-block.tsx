import { Link } from '@tanstack/react-router'
import type { ViewBlock, FixtureSourceBlock } from '@shared/views'
import type { CachedFixture } from '@/data/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
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
        <div className="view-odds-controls">
          <NativeSelect
            className="w-full min-w-0"
            aria-label="Odds market"
            value={block.marketId ?? 'auto'}
            onChange={(event) =>
              onChange({
                ...block,
                marketId: event.target.value === 'auto' ? null : Number(event.target.value)
              })
            }
          >
            <option value="auto">
              {marketId
                ? `Auto · ${markets.find(([id]) => id === marketId)?.[1] ?? `Market ${marketId}`}`
                : 'Automatic market'}
            </option>
            {block.marketId !== null && !markets.some(([id]) => id === block.marketId) && (
              <option value={block.marketId}>Market {block.marketId} · Unavailable</option>
            )}
            {markets.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            className="w-full min-w-0"
            aria-label="Odds bookmaker"
            value={block.bookmakerId ?? 'all'}
            onChange={(event) =>
              onChange({
                ...block,
                bookmakerId: event.target.value === 'all' ? null : Number(event.target.value)
              })
            }
          >
            <option value="all">All bookmakers</option>
            {block.bookmakerId !== null &&
              !all.bookmakers.some(({ id }) => id === block.bookmakerId) && (
                <option value={block.bookmakerId}>
                  Bookmaker {block.bookmakerId} · Unavailable
                </option>
              )}
            {all.bookmakers.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </NativeSelect>
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
          <div className="view-odds-outcomes">
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
