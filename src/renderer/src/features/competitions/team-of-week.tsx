import { Link } from '@tanstack/react-router'
import { ArrowUpRight, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { ErrorAlert } from '@/components/error-alert'
import { PlayerPhoto } from '@/features/players/player-photo'
import { TeamLogo } from '@/features/teams/team-logo'
import { prefetchPlayerEntity } from '@/features/players/use-player'
import { prefetchTeamEntity } from '@/features/teams/use-team'
import { prefetchFixtureEntity } from '@/features/fixtures/use-fixtures'
import { intentPrefetchProps } from '@/lib/prefetch'
import { useSubscription } from '@/features/subscription/use-subscription'
import { featureAccess } from '@/features/subscription/subscription-access'
import { useSeasonSchedule } from './use-season-schedule'
import { sortScheduleRounds } from './season-schedule-data'
import { useTeamOfWeek } from './use-team-of-week'

export function TeamOfWeek({
  competitionId,
  seasonId,
  currentSeason,
  roundId,
  date,
  online,
  onRoundChange
}: {
  competitionId: number
  seasonId: number | null
  currentSeason: boolean
  roundId?: number
  date: string
  online: boolean
  onRoundChange: (roundId: number | undefined) => void
}): React.JSX.Element {
  const subscription = useSubscription(online)
  const access = featureAccess(subscription.cached, 'totw')
  const schedule = useSeasonSchedule(seasonId, online && access !== 'not-included')
  const rounds = sortScheduleRounds(
    (schedule.cached?.stages ?? []).flatMap((stage) =>
      stage.rounds.map((round) => ({ ...round, stageName: stage.name }))
    )
  )
  const defaultRoundId = currentSeason
    ? undefined
    : rounds.filter((round) => round.finished).at(-1)?.id
  const selectedRoundId = roundId ?? defaultRoundId
  const invalidRound =
    selectedRoundId !== undefined &&
    !!schedule.cached &&
    !rounds.some((round) => round.id === selectedRoundId)
  const input =
    seasonId === null || invalidRound || (!currentSeason && selectedRoundId === undefined)
      ? null
      : { competitionId, roundId: selectedRoundId }
  const selection = useTeamOfWeek(input, online && access !== 'not-included')
  const entries = [...(selection.cached?.entries ?? [])]
    .filter((entry) => entry.round.season_id === seasonId)
    .sort(
      (left, right) =>
        (left.formation_position ?? Infinity) - (right.formation_position ?? Infinity)
    )
  const selectedRound = entries[0]?.round
  const formation = entries[0]?.formation
  const error = selection.error ?? schedule.error
  const loading =
    !selection.cached &&
    !error &&
    online &&
    access !== 'not-included' &&
    (selection.refreshing || selection.cached === undefined || schedule.cached === undefined)

  return (
    <section className="space-y-4" aria-label="Team of the Week">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Team of the Week</h2>
          {selectedRound && (
            <p className="mt-1 text-sm text-muted-foreground">
              Round {selectedRound.name}
              {formation ? ` · ${formation}` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(currentSeason || rounds.length > 0) && (
            <NativeSelect
              aria-label="Team of the Week round"
              value={selectedRoundId ?? 'latest'}
              onChange={(event) =>
                onRoundChange(
                  event.target.value === 'latest' ? undefined : Number(event.target.value)
                )
              }
            >
              {currentSeason && <option value="latest">Latest selection</option>}
              {rounds.map((round) => (
                <option key={round.id} value={round.id}>
                  Round {round.name}
                  {(schedule.cached?.stages.length ?? 0) > 1 ? ` · ${round.stageName}` : ''}
                </option>
              ))}
            </NativeSelect>
          )}
          <Button
            aria-label="Refresh Team of the Week"
            size="icon"
            variant="ghost"
            disabled={
              !online || selection.refreshing || schedule.refreshing || subscription.refreshing
            }
            onClick={async () => {
              await subscription.refresh()
              await Promise.all([schedule.refresh(), selection.refresh()])
            }}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </div>
      {error && <ErrorAlert>{error}</ErrorAlert>}
      {access === 'not-included' && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Team of the Week is not included in your Sportmonks plan.{' '}
            <Link to="/settings" className="text-foreground underline underline-offset-4">
              View subscription
            </Link>
          </CardContent>
        </Card>
      )}
      {entries.length === 0 && access !== 'not-included' && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {invalidRound
              ? 'This round is not part of the selected season.'
              : loading
                ? 'Loading Team of the Week…'
                : !selection.cached && !online
                  ? 'Team of the Week not available offline.'
                  : error
                    ? 'Team of the Week unavailable.'
                    : 'No Team of the Week published for this selection.'}
          </CardContent>
        </Card>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {entries.map((entry) => {
          const playerName = entry.player?.display_name ?? `Player ${entry.player_id}`
          const context = { competition: competitionId, date, season: entry.round.season_id }
          return (
            <Card key={entry.id} className="gap-0 overflow-hidden">
              <CardHeader className="pb-3">
                <Link
                  to="/players/$playerId"
                  params={{ playerId: String(entry.player_id) }}
                  search={{ ...context, team: entry.team_id }}
                  className="group block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...intentPrefetchProps(online, () => prefetchPlayerEntity(entry.player_id))}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <PlayerPhoto
                      className="size-16 rounded-full bg-portrait shadow-sm"
                      imagePath={entry.player?.image_path ?? null}
                      online={online}
                    />
                    <div className="text-right">
                      <div className="font-mono text-2xl font-semibold tabular-nums">
                        {entry.rating?.toFixed(2) ?? '—'}
                      </div>
                      <div className="text-xs text-muted-foreground">Rating</div>
                    </div>
                  </div>
                  <CardTitle className="text-sm leading-snug group-hover:text-primary">
                    {playerName}
                  </CardTitle>
                </Link>
              </CardHeader>
              <CardContent className="pb-4">
                <Link
                  to="/teams/$teamId"
                  params={{ teamId: String(entry.team_id) }}
                  search={context}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
                  {...intentPrefetchProps(online, () => prefetchTeamEntity(entry.team_id))}
                >
                  <TeamLogo
                    className="size-5"
                    imagePath={entry.team?.image_path ?? null}
                    online={online}
                  />
                  {entry.team?.name ?? `Team ${entry.team_id}`}
                </Link>
              </CardContent>
              <Link
                to="/fixtures/$fixtureId"
                params={{ fixtureId: String(entry.fixture_id) }}
                search={context}
                className="mt-auto flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-primary"
                {...intentPrefetchProps(online, () => prefetchFixtureEntity(entry.fixture_id))}
              >
                View match <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
