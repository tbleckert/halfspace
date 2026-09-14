import { Link } from '@tanstack/react-router'
import type { FixtureSourceBlock, ViewBlock } from '@shared/views'
import type { CachedFixture } from '@/data/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { fixtureParticipantAt } from '@/lib/fixture'
import { usePredictions } from '@/features/fixtures/use-predictions'
import { useSubscription } from '@/features/subscription/use-subscription'
import { featureAccess } from '@/features/subscription/subscription-access'
import { LinkedMatchView } from './linked-match-view'
import { BlockError } from './view-block-state'

type ProbabilityBlock = Extract<ViewBlock, { type: 'probability-context' }>
const markets = {
  'match-result': {
    id: 237,
    label: 'Full-time result',
    outcomes: [
      ['home', 'Home'],
      ['draw', 'Draw'],
      ['away', 'Away']
    ]
  },
  'both-teams-to-score': {
    id: 231,
    label: 'Both teams to score',
    outcomes: [
      ['yes', 'Yes'],
      ['no', 'No']
    ]
  },
  'total-goals-2.5': {
    id: 235,
    label: 'Total goals · 2.5',
    outcomes: [
      ['yes', 'Over 2.5'],
      ['no', 'Under 2.5']
    ]
  }
} as const

export function ProbabilityBlockContent({
  block,
  source,
  onChange
}: {
  block: ProbabilityBlock
  source: FixtureSourceBlock
  onChange: (block: ViewBlock) => void
}): React.JSX.Element {
  return (
    <LinkedMatchView block={block} source={source}>
      {(fixture, online, date) => (
        <Probabilities
          key={fixture.id}
          block={block}
          fixture={fixture}
          online={online}
          date={date}
          onChange={onChange}
        />
      )}
    </LinkedMatchView>
  )
}

function Probabilities({
  block,
  fixture,
  online,
  date,
  onChange
}: {
  block: ProbabilityBlock
  fixture: CachedFixture
  online: boolean
  date: string
  onChange: (block: ViewBlock) => void
}): React.JSX.Element {
  const subscription = useSubscription(online)
  const access = featureAccess(subscription.cached, 'predictions')
  const query = usePredictions(fixture.id, online && access !== 'not-included')
  const market = markets[block.market]
  const records =
    query.cached?.predictions.filter(
      (record) => record.fixture_id === fixture.id && record.type_id === market.id
    ) ?? []
  const record = records.length === 1 ? records[0] : undefined
  const home = fixtureParticipantAt(fixture.raw, 'home')?.name ?? 'Home'
  const away = fixtureParticipantAt(fixture.raw, 'away')?.name ?? 'Away'
  return (
    <Card>
      <CardHeader>
        <CardTitle>Probability context</CardTitle>
        <Link
          to="/fixtures/$fixtureId/preview"
          params={{ fixtureId: String(fixture.id) }}
          search={{ competition: fixture.leagueId, season: fixture.seasonId, date }}
          className="text-sm font-medium wrap-anywhere hover:text-primary"
        >
          {fixture.name ?? `${home} vs ${away}`}
        </Link>
        <p className="text-xs text-muted-foreground">Sportmonks · Pre-match model</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <NativeSelect
          aria-label="Probability market"
          value={block.market}
          onChange={(event) =>
            onChange({ ...block, market: event.target.value as ProbabilityBlock['market'] })
          }
        >
          {Object.entries(markets).map(([value, market]) => (
            <option key={value} value={value}>
              {market.label}
            </option>
          ))}
        </NativeSelect>
        <BlockError error={query.error} online={online} refresh={query.refresh} />
        {access === 'not-included' && (
          <p className="text-sm text-muted-foreground">
            Predictions are not included in your Sportmonks plan.
          </p>
        )}
        {query.cached && (
          <div className="view-probability-outcomes">
            {market.outcomes.map(([key, label]: readonly [string, string]) => {
              const value = record?.predictions[key]
              const probability =
                typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
                  ? value
                  : null
              const name = key === 'home' ? home : key === 'away' ? away : label
              return (
                <div key={key} className="min-w-0">
                  <p className="text-sm wrap-anywhere">{name}</p>
                  <p className="mt-2 font-mono text-2xl tabular-nums">
                    {probability === null ? '—' : `${probability.toFixed(2)}%`}
                  </p>
                  <div
                    aria-hidden
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-background"
                  >
                    <div
                      className="h-full rounded-full bg-chart-2"
                      style={{ width: `${probability ?? 0}%` }}
                    />
                  </div>
                  {probability === null && (
                    <p className="mt-2 text-xs text-muted-foreground">Not reported</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {!record && access !== 'not-included' && (
          <p role="status" className="text-sm text-muted-foreground">
            {records.length > 1
              ? 'Conflicting reports for this market; probabilities are unavailable.'
              : query.cached
                ? 'No probabilities reported for this market.'
                : query.error
                  ? 'Probabilities unavailable.'
                  : online
                    ? 'Loading probabilities…'
                    : 'Probabilities not cached for offline use.'}
          </p>
        )}
        <div className="view-probability-provenance text-xs text-muted-foreground">
          {query.cached && (
            <p>
              Fetched{' '}
              <span className="font-mono tabular-nums">
                {new Date(query.cached.fetchedAt).toLocaleString()}
              </span>
              {!online && ' · Offline'}
            </p>
          )}
          <p>
            Model update time, calibration and confidence interval are not provided in this report.
            Reported percentages are not adjusted or converted into betting edges.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
