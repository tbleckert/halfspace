import type { SportmonksParticipant } from '@shared/contracts'
import { TeamLogo } from '@/features/teams/team-logo'
import { cn } from '@/lib/utils'

export function FixtureStatTeam({
  align,
  online,
  participant
}: {
  align: 'left' | 'right'
  online: boolean
  participant?: SportmonksParticipant
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2 text-sm font-semibold',
        align === 'right' && 'flex-row-reverse text-right'
      )}
    >
      <TeamLogo
        className="size-7 bg-background"
        imagePath={participant?.image_path ?? null}
        online={online}
      />
      <span className="truncate">{participant?.name ?? 'Team'}</span>
    </div>
  )
}
