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
        'inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600',
        className
      )}
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full rounded-full bg-emerald-500 opacity-70 motion-safe:animate-ping" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
      </span>
      <span className={cn(!showLabel && 'sr-only')}>Live</span>
    </span>
  )
}
