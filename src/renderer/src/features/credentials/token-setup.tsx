import { SportmonksTokenForm } from './sportmonks-token-form'

export function TokenSetup(): React.JSX.Element {
  return (
    <main className="grid h-full place-items-center bg-background p-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 grid size-10 place-items-center rounded-xl bg-primary font-semibold text-primary-foreground">
          H
        </div>
        <h1 className="mb-8 text-3xl font-semibold tracking-tight">Connect Sportmonks</h1>
        <SportmonksTokenForm autoFocus buttonLabel="Continue" />
      </div>
    </main>
  )
}
