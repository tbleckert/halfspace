import { useState } from 'react'
import { Star } from 'lucide-react'
import { usePinnedTeams, toggleTeamPin } from './use-team-pins'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function TeamPin({
  team
}: {
  team: { id: number; name: string; imagePath: string | null }
}): React.JSX.Element {
  const pins = usePinnedTeams()
  const pinned = pins?.some(({ teamId }) => teamId === team.id) ?? false
  const [error, setError] = useState(false)
  return (
    <span className="relative inline-flex">
      <Button
        size="icon"
        variant="ghost"
        aria-label={`${pinned ? 'Unpin' : 'Pin'} ${team.name}`}
        aria-pressed={pinned}
        onClick={() => {
          setError(false)
          void toggleTeamPin(team).catch(() => setError(true))
        }}
      >
        <Star className={cn('size-4', pinned && 'fill-warning-muted text-warning')} />
      </Button>
      {error && (
        <span
          role="alert"
          className="absolute right-0 top-full z-10 w-44 rounded-md bg-background p-2 text-xs text-destructive shadow-sm"
        >
          Could not update this pin.
        </span>
      )}
    </span>
  )
}
