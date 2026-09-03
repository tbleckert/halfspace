import { cn } from '@/lib/utils'

export function FootballIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg aria-hidden="true" className={cn('size-3.5', className)} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.25" />
      <path d="m8 4.25 2.5 1.8-.95 2.95h-3.1L5.5 6.05 8 4.25Z" fill="currentColor" />
      <path
        d="m5.5 6.05-2.7-.2M6.45 9l-1.6 2.25M9.55 9l1.6 2.25m-.65-5.2 2.7-.2M8 4.25V1.75"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  )
}
