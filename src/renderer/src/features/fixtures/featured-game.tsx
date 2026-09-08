import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { db, readFixtureQuery, type CachedFixture } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { currentFixtureScore, fixtureParticipantAt } from '@/lib/fixture'
import { fixtureRowStatus } from '@/lib/fixture-state'
import { formatFixtureTime } from '@/lib/date'
import { intentPrefetchProps } from '@/lib/prefetch'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FixtureVenueBackground } from './fixture-venue-background'
import { TeamLogo } from '@/features/teams/team-logo'
import { MatchdayCard } from './matchday-card'
import { FixtureLiveIndicator } from './fixture-live-indicator'
import { prefetchFixtureEntity } from './use-fixtures'
import {
  readFeaturedCandidates,
  persistFeaturedSelection,
  warmFeaturedContext
} from './featured-game-data'
import { selectFeaturedGame } from './featured-game-selection'

export function FeaturedGame({
  date,
  timeZone,
  fixtures,
  complete,
  online
}: {
  date: string
  timeZone: string
  fixtures: CachedFixture[]
  complete: boolean
  online: boolean
}): React.JSX.Element | null {
  const key = `${date}|${timeZone}`
  const fixtureKey = fixtures
    .map(({ id }) => id)
    .sort((a, b) => a - b)
    .join(',')
  const fixtureCount = fixtures.length
  const contextKey = `${key}|${fixtureKey}`
  const [prepared, setPrepared] = useState('')
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!complete || fixtureCount < 5 || !online) return
    let cancelled = false
    let running = false
    let nextRefresh = 0
    function active(): boolean {
      return !cancelled && navigator.onLine && document.visibilityState !== 'hidden'
    }
    async function refresh(): Promise<void> {
      if (!active() || running || Date.now() < nextRefresh) return
      running = true
      const { fixtures: current } = await readFixtureQuery(date, timeZone)
      if (active()) await warmFeaturedContext(current, date, active)
      running = false
      if (active()) {
        setPrepared(contextKey)
        nextRefresh = Date.now() + 3_600_000
      }
    }
    const wake = (): void => {
      if (active()) {
        setNow(Date.now())
        void refresh()
      }
    }
    wake()
    const interval = window.setInterval(wake, 60_000)
    window.addEventListener('focus', wake)
    document.addEventListener('visibilitychange', wake)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', wake)
      document.removeEventListener('visibilitychange', wake)
    }
  }, [contextKey, complete, online, date, timeZone, fixtureCount])
  const cached = useScopedLiveQuery(async () => {
    if (!complete) return null
    const previous = await db.featuredGameSelections.get(key)
    const { fixtures: current } = await readFixtureQuery(date, timeZone)
    const selected = selectFeaturedGame(
      await readFeaturedCandidates(current, date),
      now,
      previous?.fixtureId
    )
    return { selected, previousId: previous?.fixtureId }
  }, [key, complete, now])
  const ready = !online || prepared === contextKey || cached?.previousId !== undefined
  const selected = ready ? cached?.selected : null
  useEffect(() => {
    if (ready && cached?.selected && cached.selected.fixture.id !== cached.previousId)
      void persistFeaturedSelection(date, timeZone, now).catch(() => undefined)
  }, [ready, cached, date, timeZone, now])
  if (!selected) {
    if (!ready && fixtureCount > 10)
      return (
        <Card aria-label="Loading featured game" className="bg-sidebar-accent p-6">
          <Skeleton className="h-5 w-32" />
          <div className="mt-5 space-y-3">
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-9 w-2/3" />
          </div>
          <Skeleton className="mt-5 h-4 w-40" />
        </Card>
      )
    return null
  }
  const fixture = selected.fixture
  const home = fixtureParticipantAt(fixture.raw, 'home')
  const away = fixtureParticipantAt(fixture.raw, 'away')
  const score = currentFixtureScore(fixture.raw)
  const status = fixtureRowStatus(fixture.raw)
  return (
    <MatchdayCard className="relative isolate overflow-hidden bg-sidebar-accent">
      <FixtureVenueBackground imagePath={fixture.raw.venue?.image_path ?? null} online={online} />
      <Link
        to="/fixtures/$fixtureId"
        params={{ fixtureId: String(fixture.id) }}
        search={{ date, competition: fixture.leagueId, season: fixture.seasonId }}
        className="relative flex flex-col gap-5 rounded-xl p-5 outline-none transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:p-6"
        {...intentPrefetchProps(online, () => prefetchFixtureEntity(fixture.id))}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Featured game</h2>
          <ArrowUpRight className="size-4 text-primary" />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          {[
            { team: home, goals: score.home },
            { team: away, goals: score.away }
          ].map(({ team, goals }, index) => (
            <div key={index} className="flex min-w-0 items-center gap-3">
              <TeamLogo
                imagePath={team?.image_path ?? null}
                online={online}
                className="size-9 bg-background"
              />
              <span className="min-w-0 flex-1 text-xl font-semibold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-2xl">
                {team?.name ?? (index === 0 ? 'Home team' : 'Away team')}
              </span>
              {status.kind !== 'kickoff' && goals !== undefined && (
                <span className="font-mono text-2xl font-semibold tabular-nums">{goals}</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="flex items-center gap-2 font-mono font-semibold tabular-nums">
            {status.kind === 'in-play' && <FixtureLiveIndicator showLabel={false} />}{' '}
            {status.kind === 'kickoff' ? formatFixtureTime(fixture.startingAt) : status.label}
          </span>
          <span>{fixture.raw.league?.name}</span>
          {selected.reasons.length > 0 && (
            <span className="text-primary">{selected.reasons.slice(0, 2).join(' · ')}</span>
          )}
        </div>
      </Link>
    </MatchdayCard>
  )
}
