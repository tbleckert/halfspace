import { Link } from '@tanstack/react-router'
import type { SportmonksSidelined } from '@shared/contracts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayerPhoto } from '@/features/players/player-photo'
import { prefetchPlayerEntity } from '@/features/players/use-player'
import { intentPrefetchProps } from '@/lib/prefetch'

export function TeamAvailability({
  absences,
  competitionId,
  online,
  teamId
}: {
  absences?: SportmonksSidelined[]
  competitionId?: number
  online: boolean
  teamId: number
}): React.JSX.Element {
  const current = absences
    ?.filter(({ completed }) => !completed)
    .toSorted(
      (a, b) => a.category.localeCompare(b.category) || a.start_date.localeCompare(b.start_date)
    )

  return (
    <Card>
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="text-sm">Current absences</CardTitle>
      </CardHeader>
      {!current?.length ? (
        <CardContent className="p-4 text-sm text-muted-foreground">
          {current ? 'No absences reported' : 'Absence data unavailable'}
        </CardContent>
      ) : (
        <div className="divide-y">
          {current.map((absence) => (
            <Link
              key={absence.id}
              to="/players/$playerId"
              params={{ playerId: String(absence.player_id) }}
              search={{ competition: competitionId, team: teamId, season: undefined }}
              className="flex items-start gap-3 px-4 py-3 hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              {...intentPrefetchProps(online, () => prefetchPlayerEntity(absence.player_id))}
            >
              <PlayerPhoto
                className="size-10 rounded-full bg-background"
                imagePath={absence.player?.image_path ?? null}
                online={online}
              />
              <div className="min-w-0 text-sm">
                <p className="font-semibold">
                  {absence.player?.display_name ?? `Player ${absence.player_id}`}
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  {absence.type?.name ??
                    (absence.category === 'suspension'
                      ? 'Suspended'
                      : absence.category === 'injury'
                        ? 'Injury'
                        : 'Unavailable')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Since {formatDate(absence.start_date)}
                </p>
                {absence.games_missed > 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="font-mono tabular-nums">{absence.games_missed}</span>{' '}
                    {absence.games_missed === 1 ? 'match' : 'matches'} missed
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${date}T12:00:00Z`))
}
