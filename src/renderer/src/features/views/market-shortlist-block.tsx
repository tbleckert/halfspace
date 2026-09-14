import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Check } from 'lucide-react'
import type { ViewBlock } from '@shared/views'
import type { CachedFixture } from '@/data/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { TeamLogo } from '@/features/teams/team-logo'
import { fixtureParticipantAt } from '@/lib/fixture'
import { useOnline } from '@/lib/use-online'
import { useCompetitionDetail } from '@/features/competitions/use-competition-detail'
import { useCompetitionSeasons } from '@/features/competitions/use-competition-workspace'
import { useFixtureOdds } from '@/features/fixtures/use-fixtures'
import { oddsQuoteTime } from '@/features/fixtures/odds-comparison'
import { useSubscription } from '@/features/subscription/use-subscription'
import { featureAccess } from '@/features/subscription/subscription-access'
import { BlockError } from './view-block-state'
import { shortlistPrices, type MarketShortlistBlock } from './market-shortlist-data'
import { useMarketShortlist } from './use-market-shortlist'

export function MarketShortlistBlockContent({
  block,
  onChange
}: {
  block: MarketShortlistBlock
  onChange: (block: ViewBlock) => void
}): React.JSX.Element {
  const online = useOnline()
  const { query, fixtures, selected, input, today } = useMarketShortlist(block, online)
  const competition = useCompetitionDetail(block.competitionId, online)
  const seasons = useCompetitionSeasons(block.competitionId, online)
  const season = seasons.cached?.seasons.find((season) => season.id === block.seasonId)
  const subscription = useSubscription(online)
  const access = featureAccess(subscription.cached, 'prematch')
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(fixtures.length / 6))
  const currentPage = Math.min(page, pageCount - 1)
  return (
    <div className="space-y-2">
      <Link
        to="/competitions/$competitionId"
        params={{ competitionId: String(block.competitionId) }}
        search={{ season: block.seasonId, date: today }}
        className="flex w-fit max-w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
      >
        <span className="truncate">
          {competition.cached?.competition?.name ?? `Competition ${block.competitionId}`} ·{' '}
          {season?.name ?? `Season ${block.seasonId}`}
        </span>
        <ArrowUpRight className="size-3 shrink-0" />
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Market shortlist</CardTitle>
          <p className="text-xs text-muted-foreground">
            Full-time result · Pre-match decimal prices
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="view-research-controls">
            <NativeSelect
              aria-label="Shortlist window"
              value={block.period}
              onChange={(event) => {
                setPage(0)
                onChange({ ...block, period: event.target.value as MarketShortlistBlock['period'] })
              }}
            >
              <option value="next-seven-days">Next seven days</option>
              <option value="weekend">This weekend</option>
            </NativeSelect>
            <NativeSelect
              aria-label="Shortlist outcome"
              value={block.outcome}
              onChange={(event) =>
                onChange({
                  ...block,
                  outcome: event.target.value as MarketShortlistBlock['outcome']
                })
              }
            >
              <option value="all">All outcomes</option>
              <option value="home">Home win</option>
              <option value="draw">Draw</option>
              <option value="away">Away win</option>
            </NativeSelect>
          </div>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {input.startDate} – {input.endDate}
          </p>
          <BlockError error={query.error} online={online} refresh={query.refresh} />
          <BlockError
            error={seasons.error ?? competition.error}
            online={online}
            refresh={async () => {
              await Promise.all([seasons.refresh(), competition.refresh()])
            }}
          />
          {access === 'not-included' && (
            <p className="text-sm text-muted-foreground">
              Pre-match odds are not included in your Sportmonks plan.
            </p>
          )}
          {query.cached?.query && block.selectedFixtureId !== null && !selected && (
            <div className="space-y-2" role="status">
              <p className="text-sm text-muted-foreground">
                Selected match is outside this window or no longer scheduled.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChange({ ...block, selectedFixtureId: null })}
              >
                Use first available match
              </Button>
            </div>
          )}
          {!query.cached?.query ? (
            <p role="status" className="text-sm text-muted-foreground">
              {query.error
                ? 'Matches unavailable.'
                : online
                  ? 'Loading matches…'
                  : 'Matches not cached for offline use.'}
            </p>
          ) : fixtures.length ? (
            <>
              <div className="view-shortlist-matches">
                {fixtures.slice(currentPage * 6, currentPage * 6 + 6).map((fixture) => (
                  <Candidate
                    key={fixture.id}
                    fixture={fixture}
                    online={online}
                    pricesEnabled={online && access !== 'not-included'}
                    accessDenied={access === 'not-included'}
                    outcome={block.outcome}
                    selected={fixture.id === selected?.id}
                    onSelect={() => onChange({ ...block, selectedFixtureId: fixture.id })}
                  />
                ))}
              </div>
              {pageCount > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 0}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    Previous matches
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {currentPage * 6 + 1}–{Math.min(fixtures.length, currentPage * 6 + 6)} of{' '}
                    {fixtures.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage + 1 === pageCount}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Next matches
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No scheduled matches in this competition and season within the selected window.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Kickoff order · Highest active listed prices per outcome. Select a match to inspect its
            linked cards.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function Candidate({
  fixture,
  online,
  pricesEnabled,
  accessDenied,
  outcome,
  selected,
  onSelect
}: {
  fixture: CachedFixture
  online: boolean
  pricesEnabled: boolean
  accessDenied: boolean
  outcome: MarketShortlistBlock['outcome']
  selected: boolean
  onSelect: () => void
}): React.JSX.Element {
  const query = useFixtureOdds(fixture.id, pricesEnabled, 'pre-match', false)
  const prices = shortlistPrices(
    query.cached?.odds.map((quote) => quote.raw) ?? [],
    fixture.id,
    outcome
  )
  const times = prices.flatMap(({ quote }) => (quote ? [oddsQuoteTime(quote)] : []))
  const oldestQuote =
    times.length && times.every((time) => time !== null) ? Math.min(...times) : null
  return (
    <section className="min-w-0 space-y-3">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Inspect ${fixture.name ?? `match ${fixture.id}`}`}
        className={`w-full rounded-lg p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? 'bg-secondary' : 'hover:bg-sidebar-accent'}`}
      >
        <div className="mb-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <time
            className="font-mono tabular-nums"
            dateTime={new Date(fixture.startingAt!).toISOString()}
          >
            {new Date(fixture.startingAt!).toLocaleString(undefined, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </time>
          {selected && <Check className="size-3.5 shrink-0 text-primary" aria-hidden />}
        </div>
        <div className="space-y-2">
          {(['home', 'away'] as const).map((side) => {
            const team = fixtureParticipantAt(fixture.raw, side)
            return (
              <div key={side} className="flex items-center gap-2">
                <TeamLogo
                  imagePath={team?.image_path ?? null}
                  online={online}
                  className="size-5 shrink-0"
                />
                <span className="text-sm font-semibold wrap-anywhere">
                  {team?.name ?? `${side === 'home' ? 'Home' : 'Away'} team not reported`}
                </span>
              </div>
            )
          })}
        </div>
      </button>
      <BlockError error={query.error} online={online} refresh={query.refresh} />
      {query.cached?.query ? (
        <div
          className="grid gap-3 px-3"
          style={{ gridTemplateColumns: `repeat(${prices.length}, minmax(0, 1fr))` }}
        >
          {prices.map(({ label, quote }) => (
            <div key={label} className="min-w-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 font-mono text-lg tabular-nums">{quote?.value ?? '—'}</p>
              {!quote && <p className="mt-1 text-xs text-muted-foreground">No active price</p>}
            </div>
          ))}
        </div>
      ) : (
        !accessDenied && (
          <p className="px-3 text-xs text-muted-foreground">
            {query.error
              ? 'Prices unavailable.'
              : online
                ? 'Loading prices…'
                : 'Prices not cached.'}
          </p>
        )
      )}
      {query.cached?.query && (
        <div className="space-y-2">
          <p className="px-3 text-xs text-muted-foreground">
            {oldestQuote === null ? (
              'Quote time unknown'
            ) : (
              <>
                Oldest quote{' '}
                <time
                  className="font-mono tabular-nums"
                  dateTime={new Date(oldestQuote).toISOString()}
                >
                  {new Date(oldestQuote).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </time>
              </>
            )}
          </p>
          <details className="px-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Quote details{!online && ' · Offline'}
            </summary>
            <div className="mt-3 space-y-3">
              {prices.map(({ label, quote }) => {
                if (!quote) return null
                const time = oddsQuoteTime(quote)
                return (
                  <div key={label}>
                    <p className="wrap-anywhere">
                      {label} · {quote.bookmaker?.name ?? `Bookmaker ${quote.bookmaker_id}`}
                    </p>
                    <p className="mt-1 font-mono tabular-nums">
                      {time === null ? 'Quote time unknown' : new Date(time).toLocaleString()}
                    </p>
                  </div>
                )
              })}
              <p>
                Fetched{' '}
                <span className="font-mono tabular-nums">
                  {new Date(query.cached.query.fetchedAt).toLocaleString()}
                </span>
              </p>
            </div>
          </details>
        </div>
      )}
    </section>
  )
}
