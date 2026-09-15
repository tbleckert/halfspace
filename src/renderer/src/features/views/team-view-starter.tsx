import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Shield } from 'lucide-react'
import type { ViewContext, ViewSpec, ViewTeamContext } from '@shared/views'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
  const [open, setOpen] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState('')
  const team = teams.find((item) => item.teamId === selectedTeam) ?? teams[0]
  const online = useOnline()
  const competitions = useTeamCompetitions(open ? (team?.teamId ?? null) : null, online)
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
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card className="h-full">
        <CardHeader className="gap-3">
          <Shield className="size-5 text-primary" aria-hidden />
          <CardTitle>Team home</CardTitle>
          <CardDescription>Matches, form and news. Your club in one place.</CardDescription>
        </CardHeader>
        <CardContent className="mt-auto pt-2">
          {team ? (
            <DialogTrigger render={<Button />}>Create team home</DialogTrigger>
          ) : (
            <Button variant="outline" nativeButton={false} render={<Link to="/teams" />}>
              Browse teams
            </Button>
          )}
        </CardContent>
      </Card>
      {team && (
        <DialogContent
          className="max-h-[85dvh] gap-6 overflow-y-auto p-6"
          aria-describedby="team-starter-description"
        >
          <div className="space-y-2">
            <DialogTitle>Create a team home</DialogTitle>
            <p id="team-starter-description" className="text-sm text-muted-foreground">
              Follow your team across all competitions.
            </p>
          </div>
          <div className="grid gap-5">
            <div className="space-y-2">
              <Label htmlFor="starter-team">Team</Label>
              <ViewTeamSelect
                id="starter-team"
                className="w-full"
                value={team.teamId}
                teams={teams}
                onValueChange={(value) => {
                  setSelectedTeam(Number(value))
                  setSelectedSeason('')
                }}
              />
            </div>
            {context && (
              <div className="space-y-2">
                <Label htmlFor="team-starter-season">Standings &amp; season stats</Label>
                <ViewContextSelect
                  id="team-starter-season"
                  className="w-full"
                  contexts={available}
                  value={`${context.competitionId}:${context.seasonId}`}
                  onValueChange={(value) => setSelectedSeason(value)}
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
        </DialogContent>
      )}
    </Dialog>
  )
}
