import { useEffect, useState } from 'react'
import { Link, Outlet } from '@tanstack/react-router'
import { CalendarDays, Circle, Settings } from 'lucide-react'
import { TokenSetup } from '@/features/credentials/token-setup'
import { useConnectionState } from '@/features/credentials/use-connection-state'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function AppShell(): React.JSX.Element {
  const { connection, error, reload } = useConnectionState()

  if (connection === null && error) {
    return (
      <main className="grid h-full place-items-center bg-background p-8">
        <div className="w-full max-w-sm">
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
        <div className="grid size-10 place-items-center rounded-xl bg-primary font-semibold text-primary-foreground">
          H
        </div>
      </main>
    )
  }

  if (!connection?.configured) {
    return <TokenSetup />
  }

  return <Workspace />
}

function Workspace(): React.JSX.Element {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const update = (): void => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)

    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return (
    <div className="grid h-full grid-cols-[14rem_1fr] bg-background">
      <aside className="flex min-h-0 flex-col border-r bg-card px-3 py-4">
        <div className="px-3 py-2">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              H
            </div>
            <div>
              <p className="font-semibold tracking-tight">Halfspace</p>
            </div>
          </div>
        </div>

        <nav className="mt-5 flex flex-col gap-1">
          <SidebarLink exact icon={<CalendarDays className="size-4" />} label="Fixtures" to="/" />
          <SidebarLink icon={<Settings className="size-4" />} label="Settings" to="/settings" />
        </nav>

        <div className="mt-auto flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
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
  to: '/' | '/settings'
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
