import { useEffect, useMemo, useRef } from 'react'
import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { CalendarDays, Circle, Clock3, Settings, Trophy } from 'lucide-react'
import type { SportmonksRateLimit } from '@shared/contracts'
import { TokenSetup } from '@/features/credentials/token-setup'
import { useConnectionState } from '@/features/credentials/use-connection-state'
import { Button } from '@/components/ui/button'
import { HalfspaceLogo } from '@/components/halfspace-logo'
import { CompetitionLogo } from '@/features/competitions/competition-logo'
import { sidebarCompetitions } from '@/features/competitions/sidebar-competitions'
import { prefetchCompetitionWorkspace } from '@/features/competitions/use-competition-workspace'
import { useCompetitions, usePinnedCompetitionIds } from '@/features/competitions/use-competitions'
import { prefetchFixtureQuery } from '@/features/fixtures/use-fixtures'
import { EntitySearchPalette } from '@/features/search/entity-search-palette'
import { currentTimeZone } from '@/lib/date'
import { intentPrefetchProps, startPrefetch } from '@/lib/prefetch'
import { useTodayInTimeZone } from '@/lib/use-today'
import { cn } from '@/lib/utils'
import { useOnline } from '@/lib/use-online'

const noPinnedCompetitionIds: number[] = []

export function AppShell(): React.JSX.Element {
  const { connection, error, rateLimit, reload } = useConnectionState()

  if (connection === null && error) {
    return (
      <main className="grid h-full place-items-center bg-background p-8">
        <div className="w-full max-w-sm">
          <HalfspaceLogo className="mb-8 size-10 rounded-xl" />
          <h1 className="text-3xl font-semibold tracking-tight">Couldn’t open Halfspace</h1>
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-6" onClick={() => void reload()}>
            Try again
          </Button>
        </div>
      </main>
    )
  }

  if (connection === null) {
    return (
      <main aria-label="Loading Halfspace" className="grid h-full place-items-center bg-background">
        <HalfspaceLogo className="size-10 rounded-xl" />
      </main>
    )
  }

  if (!connection?.configured) {
    return <TokenSetup />
  }

  return <Workspace rateLimit={rateLimit} />
}

function Workspace({ rateLimit }: { rateLimit: SportmonksRateLimit | null }): React.JSX.Element {
  const online = useOnline()
  const warmedCompetitionIds = useRef(new Set<number>())
  const { cached } = useCompetitions()
  const pinnedCompetitionIds = usePinnedCompetitionIds() ?? noPinnedCompetitionIds
  const quickCompetitions = useMemo(
    () => sidebarCompetitions(cached?.competitions ?? [], pinnedCompetitionIds),
    [cached?.competitions, pinnedCompetitionIds]
  )
  const sidebarLocation = useRouterState({
    select: ({ location }) => {
      const competitionContext = (location.search as { competition?: unknown }).competition
      const date = (location.search as { date?: unknown }).date
      const competitionRoute = /^\/competitions\/(\d+)$/.exec(location.pathname)
      const routeCompetitionId = competitionRoute ? Number(competitionRoute[1]) : null

      return {
        competitionId:
          routeCompetitionId ??
          (typeof competitionContext === 'number' ? competitionContext : null),
        date: typeof date === 'string' ? date : null,
        pathname: location.pathname
      }
    }
  })
  const timeZone = useMemo(() => currentTimeZone(), [])
  const currentDate = useTodayInTimeZone(timeZone)
  const sidebarDate = sidebarLocation.date ?? currentDate
  const matchdayActive = sidebarLocation.pathname === '/'

  useEffect(() => {
    if (!online) return

    startPrefetch(() => prefetchFixtureQuery(currentDate, timeZone))
    startPrefetch(async () => {
      for (const competition of quickCompetitions) {
        if (warmedCompetitionIds.current.has(competition.id)) continue

        try {
          await prefetchCompetitionWorkspace(competition.id)
          warmedCompetitionIds.current.add(competition.id)
        } catch {
          continue
        }
      }
    })
  }, [currentDate, online, quickCompetitions, timeZone])

  return (
    <div className="relative grid h-full grid-cols-[14.5rem_1fr] bg-background">
      <aside className="flex min-h-0 flex-col border-r border-white bg-card px-3 py-4 text-foreground">
        <div className="px-3 pb-2.5 pt-7">
          <div className="flex items-center gap-3">
            <HalfspaceLogo alt="" className="size-8 rounded-[0.6rem]" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold tracking-[-0.02em]">Halfspace</p>
            </div>
          </div>
        </div>

        <nav aria-label="Workspace" className="mt-5 flex min-h-0 flex-1 flex-col">
          <div className="flex flex-col gap-1">
            <Link
              to="/"
              search={{ date: sidebarDate }}
              aria-current={matchdayActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand-blue',
                matchdayActive &&
                  'bg-brand-blue/[0.08] font-semibold text-brand-blue hover:bg-brand-blue/[0.1] hover:text-brand-blue'
              )}
              {...intentPrefetchProps(online, () => prefetchFixtureQuery(sidebarDate, timeZone))}
            >
              <CalendarDays className="size-4" />
              Matchday
            </Link>
            <SidebarLink
              icon={<Trophy className="size-4" />}
              label="Competitions"
              to="/competitions"
            />
          </div>

          {quickCompetitions.length > 0 && (
            <div className="mt-1 flex min-h-0 flex-col gap-0.5 overflow-y-auto pl-3">
              {quickCompetitions.map((competition) => {
                const active = competition.id === sidebarLocation.competitionId

                return (
                  <Link
                    key={competition.id}
                    to="/competitions/$competitionId"
                    params={{ competitionId: String(competition.id) }}
                    aria-current={
                      active && sidebarLocation.pathname.startsWith('/competitions/')
                        ? 'page'
                        : undefined
                    }
                    className={cn(
                      'relative flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground outline-none transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand-blue',
                      active && 'bg-brand-blue/[0.08] text-brand-blue'
                    )}
                    {...intentPrefetchProps(online, () =>
                      prefetchCompetitionWorkspace(competition.id)
                    )}
                  >
                    <CompetitionLogo
                      className="size-6 bg-background"
                      imagePath={competition.imagePath}
                      online={online}
                    />
                    <span className="truncate">{competition.name}</span>
                  </Link>
                )
              })}
            </div>
          )}

          <div className="mt-auto flex flex-col gap-1 pt-4">
            <EntitySearchPalette online={online} />
            <SidebarLink icon={<Settings className="size-4" />} label="Settings" to="/settings" />
          </div>
        </nav>
      </aside>

      <main className="min-h-0 overflow-y-auto bg-background">
        <Outlet />
      </main>

      <div className="pointer-events-none absolute right-5 top-2.5 z-20 flex items-center gap-3">
        {rateLimit && <RateLimitNotice rateLimit={rateLimit} />}
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Circle
            className={cn('size-2 fill-current', online ? 'text-emerald-500' : 'text-amber-500')}
          />
          {online ? 'Online' : 'Offline'}
        </div>
      </div>
    </div>
  )
}

function RateLimitNotice({ rateLimit }: { rateLimit: SportmonksRateLimit }): React.JSX.Element {
  const subject = rateLimit.requestedEntity ?? 'Sportmonks'
  const resetTime = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  }).format(rateLimit.resetsAt)

  return (
    <div
      role="status"
      className="flex items-center gap-1.5 rounded-md bg-amber-400/15 px-2 py-1 text-xs font-medium text-amber-800"
    >
      <Clock3 className="size-3.5 shrink-0" />
      <span>{subject} limit reached</span>
      <span className="opacity-65">·</span>
      <span className="opacity-75">
        {rateLimit.estimated ? 'Available within an hour' : `Resets ${resetTime}`}
      </span>
    </div>
  )
}

function SidebarLink({
  exact = false,
  icon,
  label,
  to
}: {
  exact?: boolean
  icon: React.ReactNode
  label: string
  to: '/competitions' | '/settings'
}): React.JSX.Element {
  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand-blue"
      activeProps={{
        className:
          'bg-brand-blue/[0.08] font-semibold text-brand-blue hover:bg-brand-blue/[0.1] hover:text-brand-blue'
      }}
    >
      {icon}
      {label}
    </Link>
  )
}
