import { Card } from '@/components/ui/card'
import type { SportmonksOdd } from '@shared/contracts'
import { fixtureOddsGroups } from './fixture-detail-data'
import { FixtureEmptyState } from './fixture-empty-state'

export function FixtureOdds({
  hasOdds,
  loading,
  odds,
  offline
}: {
  hasOdds: boolean
  loading: boolean
  odds: SportmonksOdd[]
  offline: boolean
}): React.JSX.Element {
  const groups = fixtureOddsGroups(odds)

  if (groups.length === 0) {
    return (
      <Card className="overflow-hidden">
        <FixtureEmptyState>
          {loading
            ? 'Loading odds…'
            : offline
              ? 'Odds not available offline'
              : hasOdds
                ? 'Odds not available'
                : 'No odds for this fixture'}
        </FixtureEmptyState>
      </Card>
    )
  }

  return (
    <div className="grid items-start gap-5 md:grid-cols-2">
      {groups.map((group) => (
        <Card key={group.key} className="overflow-hidden">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">{group.market}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{group.bookmaker}</p>
          </div>
          <div className="divide-y">
            {group.odds.map((odd) => (
              <div
                key={odd.id}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <span className="truncate">{formatOddLabel(odd)}</span>
                <span className="font-mono font-semibold tabular-nums">{odd.value}</span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

function formatOddLabel(odd: SportmonksOdd): string {
  return [
    ...new Set([odd.name, odd.label].filter((value): value is string => Boolean(value)))
  ].join(' · ')
}
