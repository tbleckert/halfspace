import { Link } from '@tanstack/react-router'
import type { SportmonksFixture, SportmonksFixtureAbsence } from '@shared/contracts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayerPhoto } from '@/features/players/player-photo'
import { prefetchPlayerEntity } from '@/features/players/use-player'
import { TeamLogo } from '@/features/teams/team-logo'
import { intentPrefetchProps } from '@/lib/prefetch'
import { fixtureParticipantAt } from '@/lib/fixture'
import type { FixtureDetailSearch } from './fixture-route'

export function FixtureAbsences({
  fixture,
  context,
  online
}: {
  fixture: SportmonksFixture
  context: FixtureDetailSearch
  online: boolean
}): React.JSX.Element {
  const reportedAbsences = fixture.sidelined
  const teams = (['home', 'away'] as const).flatMap((side) => {
    const team = fixtureParticipantAt(fixture, side)
    return team ? [team] : []
  })
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="text-sm">Match absences</CardTitle>
      </CardHeader>
      {reportedAbsences === undefined ? (
        <CardContent className="p-4 text-sm text-muted-foreground">
          Absence data unavailable
        </CardContent>
      ) : (
        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {teams.map((team) => {
            const absences = reportedAbsences.filter(
              ({ participant_id }) => participant_id === team.id
            )
            return (
              <section key={team.id} aria-label={`${team.name} absences`} className="min-w-0">
                <div className="flex items-center gap-3 border-b px-4 py-3">
                  <TeamLogo
                    className="size-8 bg-background"
                    imagePath={team.image_path ?? null}
                    online={online}
                  />
                  <h3 className="truncate text-sm font-semibold">{team.name}</h3>
                </div>
                {absences.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No absences reported</p>
                ) : (
                  <div className="divide-y">
                    {absences.map((absence) => (
                      <AbsenceRow
                        key={absence.id}
                        absence={absence}
                        context={{ ...context, team: team.id }}
                        online={online}
                      />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function AbsenceRow({
  absence,
  context,
  online
}: {
  absence: SportmonksFixtureAbsence
  context: FixtureDetailSearch
  online: boolean
}): React.JSX.Element {
  const playerId = absence.player_id ?? absence.player?.id
  const content = (
    <>
      <PlayerPhoto
        className="size-9 shrink-0 rounded-full bg-background"
        imagePath={absence.player?.image_path ?? null}
        online={online}
      />
      <div className="min-w-0 text-sm">
        <p className="truncate font-medium">
          {absence.player?.display_name ?? (playerId ? `Player ${playerId}` : 'Player unavailable')}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {absence.type?.name ?? 'Reason not reported'}
        </p>
      </div>
    </>
  )
  if (!playerId) return <div className="flex items-center gap-3 px-4 py-3">{content}</div>
  return (
    <Link
      to="/players/$playerId"
      params={{ playerId: String(playerId) }}
      search={{
        competition: context.competition,
        date: context.date,
        season: context.season,
        team: context.team
      }}
      className="flex items-center gap-3 px-4 py-3 hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      {...intentPrefetchProps(online, () => prefetchPlayerEntity(playerId))}
    >
      {content}
    </Link>
  )
}
