import { Link } from '@tanstack/react-router'
import type { SportmonksFixture } from '@shared/contracts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { intentPrefetchProps } from '@/lib/prefetch'
import { prefetchFixtureEntity } from './use-fixtures'
import type { FixtureDetailSearch } from './fixture-route'

export function FixtureTie({
  fixture,
  context,
  online
}: {
  fixture: SportmonksFixture
  context: FixtureDetailSearch
  online: boolean
}): React.JSX.Element | null {
  const aggregate = fixture.aggregate
  if (
    !aggregate ||
    aggregate.season_id !== fixture.season_id ||
    !aggregate.fixture_ids.includes(fixture.id)
  )
    return null
  const winner = fixture.participants.find(({ id }) => id === aggregate.winner_participant_id)
  const relatedFixtures = [...new Set(aggregate.fixture_ids)].filter((id) => id !== fixture.id)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="font-medium">{aggregate.name}</p>
        <dl className="space-y-3">
          {fixture.leg && (
            <div>
              <dt className="text-xs text-muted-foreground">Leg</dt>
              <dd className="mt-1 font-mono tabular-nums">{fixture.leg}</dd>
            </div>
          )}
          {aggregate.result && (
            <div>
              <dt className="text-xs text-muted-foreground">Aggregate score</dt>
              <dd className="mt-1 font-mono text-lg font-semibold tabular-nums">
                {aggregate.result}
              </dd>
            </div>
          )}
          {winner && (
            <div>
              <dt className="text-xs text-muted-foreground">Tie winner</dt>
              <dd className="mt-1 font-medium">{winner.name}</dd>
            </div>
          )}
          {aggregate.detail && (
            <div>
              <dt className="text-xs text-muted-foreground">Outcome</dt>
              <dd className="mt-1">{aggregate.detail}</dd>
            </div>
          )}
        </dl>
        {relatedFixtures.length > 0 && (
          <ul className="space-y-2">
            {relatedFixtures.map((id) => (
              <li key={id}>
                <Link
                  to="/fixtures/$fixtureId"
                  params={{ fixtureId: String(id) }}
                  search={{ ...context, competition: fixture.league_id, season: fixture.season_id }}
                  className="rounded-sm text-primary hover:underline focus-visible:outline-ring"
                  {...intentPrefetchProps(online, () => prefetchFixtureEntity(id))}
                >
                  Related match <span className="font-mono tabular-nums">#{id}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
