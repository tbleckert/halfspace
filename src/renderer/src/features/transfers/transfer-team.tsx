import { Link } from '@tanstack/react-router'
import type { SportmonksTeam } from '@shared/contracts'
import { TeamLogo } from '@/features/teams/team-logo'
import { prefetchTeamEntity } from '@/features/teams/use-team'
import { intentPrefetchProps } from '@/lib/prefetch'

export function TransferTeam({
  teamId,
  team,
  online,
  date,
  competitionId,
  season
}: {
  teamId: number | null
  team?: SportmonksTeam | null
  online: boolean
  date?: string
  competitionId?: number
  season?: number
}): React.JSX.Element {
  if (teamId === null) return <span className="text-sm text-muted-foreground">Not reported</span>
  return (
    <Link
      to="/teams/$teamId"
      params={{ teamId: String(teamId) }}
      search={{ date, competition: competitionId, season }}
      className="flex min-w-0 items-center gap-2 rounded-sm text-sm font-medium outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
      {...intentPrefetchProps(online, () => prefetchTeamEntity(teamId))}
    >
      <TeamLogo
        className="size-7 shrink-0 bg-background"
        imagePath={team?.image_path ?? null}
        online={online}
      />
      <span className="truncate">{team?.name ?? `Team ${teamId}`}</span>
    </Link>
  )
}
