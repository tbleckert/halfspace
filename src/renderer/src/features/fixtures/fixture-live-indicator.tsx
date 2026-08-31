import { cn } from '@/lib/utils'

export function FixtureLiveIndicator({
  className,
  showLabel = true
}: {
  className?: string
  showLabel?: boolean
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono text-xs font-medium text-success-emphasis',
        className
      )}
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full rounded-full bg-success opacity-70 motion-safe:animate-ping" />
        <span className="relative inline-flex size-2 rounded-full bg-success-emphasis" />
      </span>
      <span className={cn(!showLabel && 'sr-only')}>Live</span>
    </span>
  )
}
