import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorAlert } from '@/components/error-alert'
import { Skeleton } from '@/components/ui/skeleton'
import type { CachedFixture } from '@/data/db'
import { EntityFixturePanel } from '@/features/fixtures/entity-fixture-panel'
import type { FixtureDetailSearch } from '@/features/fixtures/fixture-route'
import { PlayerPhoto } from '@/features/players/player-photo'
import { useOnline } from '@/lib/use-online'
import { cn } from '@/lib/utils'
import { useRefereeEntity } from './use-referee'

export function RefereePage({
  refereeId,
  fixtureId,
  context
}: {
  refereeId: string
  fixtureId?: number
  context: FixtureDetailSearch
}): React.JSX.Element {
  const id = Number(refereeId)
  const validId = Number.isSafeInteger(id) && id > 0
  const online = useOnline()
  const referee = useRefereeEntity(validId ? id : null, online)
  const identity = referee.cached?.referee?.raw
  const groups = useMemo(() => {
    const grouped = new Map<string, CachedFixture[]>()
    for (const { fixture, role } of referee.cached?.appointments ?? []) {
      const fixtures = grouped.get(role) ?? []
      if (!fixtures.some(({ id }) => id === fixture.id)) fixtures.push(fixture)
      grouped.set(role, fixtures)
    }
    return [...grouped]
  }, [referee.cached?.appointments])
  const loading =
    referee.cached === undefined || (!referee.cached?.referee?.detailed && online && !referee.error)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 p-7 lg:p-10">
      {fixtureId && (
        <Link
          to="/fixtures/$fixtureId/preview"
          params={{ fixtureId: String(fixtureId) }}
          search={context}
          className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Match
        </Link>
      )}
      {!validId || (!identity && !loading) ? (
        <Card>
          <CardContent className="p-5">
            {referee.error ?? (online ? 'Referee not found.' : 'Referee not available offline.')}
          </CardContent>
        </Card>
      ) : (
        <>
          <header className="flex items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <PlayerPhoto
                className="size-20 rounded-full bg-card shadow-xs"
                imagePath={identity?.image_path ?? null}
                online={online}
              />
              <div>
                {identity ? (
                  <>
                    <h1 className="text-3xl font-semibold tracking-tight">{identity.name}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {['Referee', identity.country?.name].filter(Boolean).join(' · ')}
                    </p>
                  </>
                ) : (
                  <Skeleton className="h-8 w-56" />
                )}
              </div>
            </div>
            <Button
              aria-label="Refresh referee"
              size="icon"
              variant="outline"
              disabled={!online || referee.refreshing}
              onClick={() => void referee.refresh()}
            >
              <RefreshCw className={cn('size-4', referee.refreshing && 'animate-spin')} />
            </Button>
          </header>
          {referee.error && <ErrorAlert>{referee.error}</ErrorAlert>}
          <section className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight">Recent appointments</h2>
              <span className="text-sm text-muted-foreground">Last six months</span>
            </div>
            {loading && !groups.length ? (
              <Skeleton className="h-64 w-full" />
            ) : groups.length ? (
              groups.map(([role, fixtures]) => (
                <EntityFixturePanel
                  key={role}
                  context={{}}
                  fixtures={fixtures}
                  label={role}
                  loading={false}
                  online={online}
                  showCompetition
                  fixtureSeasonLinks
                  dateDisplay="historical"
                />
              ))
            ) : (
              <Card>
                <CardContent className="p-5 text-sm text-muted-foreground">
                  {referee.cached?.referee?.detailed
                    ? 'No recent appointments reported'
                    : online
                      ? 'Appointments unavailable'
                      : 'Appointments not available offline'}
                </CardContent>
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  )
}
