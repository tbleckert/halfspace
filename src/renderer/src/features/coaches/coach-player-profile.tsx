import { Link } from '@tanstack/react-router'
import type { SportmonksPlayer } from '@shared/contracts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayerPhoto } from '@/features/players/player-photo'
import { prefetchPlayerEntity } from '@/features/players/use-player'
import { intentPrefetchProps } from '@/lib/prefetch'

export function CoachPlayerProfile({
  player,
  online,
  competitionId,
  season,
  date
}: {
  player: SportmonksPlayer | null | undefined
  online: boolean
  competitionId?: number
  season?: number
  date?: string
}): React.JSX.Element | null {
  if (!player) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Playing profile</CardTitle>
      </CardHeader>
      <CardContent>
        <Link
          to="/players/$playerId/career"
          params={{ playerId: String(player.id) }}
          search={{ competition: competitionId, season, date, team: undefined }}
          className="flex items-center gap-3 rounded-sm font-medium hover:text-primary focus-visible:outline-ring"
          {...intentPrefetchProps(online, () => prefetchPlayerEntity(player.id))}
        >
          <PlayerPhoto
            className="size-10 rounded-full bg-background"
            imagePath={player.image_path ?? null}
            online={online}
          />
          <span className="min-w-0 text-sm">{player.display_name}</span>
        </Link>
      </CardContent>
    </Card>
  )
}
