import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { ViewContext, ViewSpec, ViewTeamContext } from '@shared/views'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ErrorAlert } from '@/components/error-alert'
import { useOnline } from '@/lib/use-online'
import { useTeamCompetitions } from '@/features/teams/use-team-competitions'
import { ViewTeamSelect } from './view-team-select'
import { ViewContextSelect } from './view-context-select'
import { createTeamStarterView, createMatchPreparationView } from './starter-views'

export function TeamViewStarter({
  teams,
  contexts,
  onCreate
}: {
  teams: ViewTeamContext[]
  contexts: ViewContext[]
  onCreate: (spec: ViewSpec) => void
}): React.JSX.Element {
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null)
  const [selectedSeason, setSelectedSeason] = useState('')
  const team = teams.find((item) => item.teamId === selectedTeam) ?? teams[0]
  const online = useOnline()
  const competitions = useTeamCompetitions(team?.teamId ?? null, online)
  const available = (competitions.cached?.competitions ?? [])
    .toSorted((a, b) => Number(b.raw.type === 'league') - Number(a.raw.type === 'league'))
    .flatMap((competition) =>
      contexts.filter(
        (context) =>
          context.competitionId === competition.id &&
          context.seasonId === competition.raw.currentseason?.id &&
          context.isCurrent
      )
    )
  const context =
    available.find((item) => `${item.competitionId}:${item.seasonId}` === selectedSeason) ??
    available[0]
  if (!team)
    return (
      <Link className="mt-6 text-sm text-primary hover:underline" to="/teams">
        Find a team to create its home
      </Link>
    )
  return (
    <Card className="mt-6 w-full max-w-2xl gap-4 p-5 text-left">
      <div>
        <h3 className="font-semibold">A home for your team</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Next match, fixtures, season context and current absences.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="starter-team">Team</Label>
          <ViewTeamSelect
            id="starter-team"
            className="w-full"
            value={team.teamId}
            teams={teams}
            onChange={(event) => {
              setSelectedTeam(Number(event.target.value))
              setSelectedSeason('')
            }}
          />
        </div>
        {context && (
          <div className="space-y-2">
            <Label htmlFor="team-starter-season">Season context</Label>
            <ViewContextSelect
              id="team-starter-season"
              className="w-full"
              contexts={available}
              value={`${context.competitionId}:${context.seasonId}`}
              onChange={(event) => setSelectedSeason(event.target.value)}
            />
          </div>
        )}
      </div>
      {competitions.error && (
        <ErrorAlert>
          <span>{competitions.error}</span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!online}
            onClick={() => void competitions.refresh()}
          >
            Retry
          </Button>
        </ErrorAlert>
      )}
      {!context && (
        <p className="text-xs text-muted-foreground">
          {competitions.refreshing
            ? 'Finding current competitions…'
            : 'No current season context available. You can start with matches and absences.'}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onCreate(createTeamStarterView(team, context))}>
          Create team home
        </Button>
        <Button
          variant="outline"
          onClick={() => onCreate(createMatchPreparationView(team, context))}
        >
          Prepare next match
        </Button>
      </div>
    </Card>
  )
}
