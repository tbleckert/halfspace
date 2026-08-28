import { useMemo } from 'react'
import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { CalendarDays, Circle, Settings, Trophy } from 'lucide-react'
import { TokenSetup } from '@/features/credentials/token-setup'
import { useConnectionState } from '@/features/credentials/use-connection-state'
import { Button } from '@/components/ui/button'
import { HalfspaceLogo } from '@/components/halfspace-logo'
import { CompetitionLogo } from '@/features/competitions/competition-logo'
import { sidebarCompetitions } from '@/features/competitions/sidebar-competitions'
import { useCompetitions, usePinnedCompetitionIds } from '@/features/competitions/use-competitions'
import { EntitySearchPalette } from '@/features/search/entity-search-palette'
import { currentTimeZone, todayInTimeZone } from '@/lib/date'
import { cn } from '@/lib/utils'
import { useOnline } from '@/lib/use-online'

const noPinnedCompetitionIds: number[] = []

export function AppShell(): React.JSX.Element {
  const { connection, error, reload } = useConnectionState()

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

  return <Workspace />
}

function Workspace(): React.JSX.Element {
  const online = useOnline()
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
  const currentDate = useMemo(() => todayInTimeZone(currentTimeZone()), [])
  const sidebarDate = sidebarLocation.date ?? currentDate
  const matchdayActive = sidebarLocation.pathname === '/'

  return (
    <div className="grid h-full grid-cols-[14rem_1fr] bg-background">
      <aside className="flex min-h-0 flex-col border-r bg-card px-3 py-4">
        <div className="px-3 py-2">
          <div className="flex items-center gap-2.5">
            <HalfspaceLogo alt="" className="size-8 rounded-lg" />
            <div>
              <p className="font-semibold tracking-tight">Halfspace</p>
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
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                matchdayActive && 'bg-accent text-accent-foreground'
              )}
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
                      'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                      active && 'bg-accent text-accent-foreground'
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

        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
          <Circle
            className={cn('size-2 fill-current', online ? 'text-emerald-600' : 'text-amber-600')}
          />
          {online ? 'Online' : 'Offline'}
        </div>
      </aside>

      <main className="min-h-0 overflow-y-auto">
        <Outlet />
      </main>
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
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      activeProps={{ className: 'bg-accent text-accent-foreground' }}
    >
      {icon}
      {label}
    </Link>
  )
}
