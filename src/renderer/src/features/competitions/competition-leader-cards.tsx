import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import type { SportmonksTopscorer } from '@shared/contracts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PlayerPhoto } from '@/features/players/player-photo'
import { prefetchPlayerEntity } from '@/features/players/use-player'
import { TeamLogo } from '@/features/teams/team-logo'
import { prefetchTeamEntity } from '@/features/teams/use-team'
import { intentPrefetchProps } from '@/lib/prefetch'
import { leadingPlayers } from './player-leaders-data'
import { prefetchSeasonStatistics } from './use-competition-workspace'

const highlights = [
  { typeId: 208, category: 'goals', title: 'Top scorer', label: 'Goals' },
  { typeId: 209, category: 'assists', title: 'Top assists', label: 'Assists' }
] as const

export function CompetitionLeaderCards({
  competitionId,
  date,
  seasonId,
  online,
  loading,
  topscorers
}: {
  competitionId: number
  date: string
  seasonId: number | null
  online: boolean
  loading: boolean
  topscorers: SportmonksTopscorer[] | null
}): React.JSX.Element | null {
  if (loading) {
    return (
      <div role="status" aria-label="Loading player highlights" className="grid grid-cols-2 gap-3">
        {highlights.map(({ category }) => (
          <Card key={category} className="flex flex-col gap-4 p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="size-16 rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </Card>
        ))}
      </div>
    )
  }

  const cards = highlights.flatMap((highlight) => {
    const leaders = leadingPlayers(topscorers ?? [], highlight.typeId)
    return leaders.length > 0 ? [{ ...highlight, leaders }] : []
  })
  if (cards.length === 0) return null

  return (
    <div className="grid grid-cols-2 items-start gap-3">
      {cards.map(({ category, title, label, leaders }) => {
        const leader = leaders[0]
        const playerName = leader.player?.display_name ?? `Player ${leader.player_id}`
        const teamId = leader.participant_id
        return (
          <Card key={category} role="region" aria-label={title} className="min-w-0 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Link
                to="/players/$playerId"
                params={{ playerId: String(leader.player_id) }}
                search={{
                  competition: competitionId,
                  date,
                  season: seasonId ?? undefined,
                  team: teamId ?? undefined
                }}
                aria-label={playerName}
                className="group flex min-w-0 flex-col gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...intentPrefetchProps(online, () => prefetchPlayerEntity(leader.player_id))}
              >
                <div className="flex items-center justify-between gap-2">
                  <PlayerPhoto
                    className="size-16 rounded-full bg-background"
                    imagePath={leader.player?.image_path ?? null}
                    online={online}
                  />
                  <div className="text-right">
                    <div className="font-mono text-3xl font-semibold tabular-nums tracking-tight">
                      {leader.total}
                    </div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                </div>
                <span className="text-sm font-semibold leading-snug group-hover:text-primary">
                  {playerName}
                </span>
              </Link>
              {teamId !== null && (
                <Link
                  to="/teams/$teamId"
                  params={{ teamId: String(teamId) }}
                  search={{ competition: competitionId, date, season: seasonId ?? undefined }}
                  className="-mt-1 flex min-w-0 items-center gap-1.5 rounded-sm text-xs text-muted-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                  {...intentPrefetchProps(online, () => prefetchTeamEntity(teamId))}
                >
                  <TeamLogo
                    className="size-4"
                    imagePath={leader.participant?.image_path ?? null}
                    online={online}
                  />
                  <span className="truncate">{leader.participant?.name ?? `Team ${teamId}`}</span>
                </Link>
              )}
            </CardContent>
            <Link
              to="/competitions/$competitionId/stats"
              params={{ competitionId: String(competitionId) }}
              search={{ date, season: seasonId ?? undefined, leaderboard: category }}
              aria-label={`View ${category} leaderboard`}
              className="flex min-h-8 items-center justify-between gap-1 border-t px-4 py-2 text-xs text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              {...intentPrefetchProps(online && seasonId !== null, () =>
                prefetchSeasonStatistics(seasonId!)
              )}
            >
              <span>
                {leaders.length > 1
                  ? `Shared lead · ${leaders.length} players`
                  : 'View leaderboard'}
              </span>
              <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
            </Link>
          </Card>
        )
      })}
    </div>
  )
}
