export function FixtureEmptyState({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-h-36 items-center justify-center px-4 text-sm text-muted-foreground">
      {children}
    </div>
  )
}
