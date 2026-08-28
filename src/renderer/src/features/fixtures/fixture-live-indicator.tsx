import { cn } from '@/lib/utils'

export function FixtureLiveIndicator({ className }: { className?: string }): React.JSX.Element {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-red-600', className)}
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full rounded-full bg-red-500 opacity-70 motion-safe:animate-ping" />
        <span className="relative inline-flex size-2 rounded-full bg-red-600" />
      </span>
      Live
    </span>
  )
}
