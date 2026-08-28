import { Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Braces } from 'lucide-react'
import { db } from '@/data/db'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatFixtureTime } from '@/lib/date'

export function FixtureDetailPage({ fixtureId }: { fixtureId: string }): React.JSX.Element {
  const parsedFixtureId = Number(fixtureId)
  const isValidFixtureId = Number.isSafeInteger(parsedFixtureId) && parsedFixtureId > 0
  const fixture = useLiveQuery(
    () => (isValidFixtureId ? db.fixtures.get(parsedFixtureId) : undefined),
    [isValidFixtureId, parsedFixtureId]
  )

  if (!isValidFixtureId) {
    return <MissingFixture />
  }

  if (fixture === undefined) {
    return <div className="p-10 text-sm text-muted-foreground">Loading…</div>
  }

  if (!fixture) {
    return <MissingFixture />
  }

  const home = fixture.raw.participants.find((participant) => participant.meta?.location === 'home')
  const away = fixture.raw.participants.find((participant) => participant.meta?.location === 'away')

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-7 lg:p-10">
      <Link
        to="/"
        search={true}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Fixtures
      </Link>

      <header>
        <div className="mb-3 flex items-center gap-2">
          <Badge variant="secondary">
            {fixture.raw.league?.name ?? `League ${fixture.leagueId}`}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatFixtureTime(fixture.startingAt)}
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {home?.name ?? 'Home'} <span className="text-muted-foreground">vs</span>{' '}
          {away?.name ?? 'Away'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {fixture.resultInfo ?? fixture.raw.state?.name ?? 'Fixture details'}
        </p>
      </header>

      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <Braces className="size-4 text-primary" />
          <CardTitle className="text-base">Raw Sportmonks response</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[32rem] overflow-auto rounded-lg bg-stone-950 p-4 text-xs leading-5 text-stone-200">
            {JSON.stringify(fixture.raw, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

function MissingFixture(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl p-10">
      <Card>
        <CardContent className="p-6">
          <p className="font-medium">Fixture not found.</p>
          <Link to="/" search={true} className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>
            <ArrowLeft className="size-4" />
            Back to fixtures
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
