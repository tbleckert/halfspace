import { createRootRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/app-shell'
import { ConnectionStateProvider } from '@/features/credentials/connection-state-provider'

export const Route = createRootRoute({
  component: Root,
  notFoundComponent: () => <div className="p-10">Page not found.</div>
})

function Root(): React.JSX.Element {
  return (
    <>
      <div aria-hidden="true" className="window-drag-region" />
      <ConnectionStateProvider>
        <AppShell />
      </ConnectionStateProvider>
    </>
  )
}
