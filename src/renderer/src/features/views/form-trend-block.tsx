import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useTeamFixtures } from '@/features/teams/use-team'
import { useCurrentTime } from '@/lib/use-current-time'
import { BlockError, BlockPending } from './view-block-state'
import {
  formTrendInput,
  selectFormTrend,
  type FormTrendDefinition,
  type FormTrendMatch
} from './form-trend-data'

const outcomeLabels = { W: 'Win', D: 'Draw', L: 'Loss' }
const outcomeColors = {
  W: 'bg-success/15 text-success-emphasis',
  D: 'bg-muted text-muted-foreground',
  L: 'bg-destructive/10 text-destructive'
}

export function FormTrendBlock({
  block,
  online,
  today,
  timeZone,
  onChange
}: {
  block: FormTrendDefinition
  online: boolean
  today: string
  timeZone: string
  onChange: (block: FormTrendDefinition) => void
}): React.JSX.Element {
  const input = useMemo(
    () => formTrendInput(block.teamId, today, timeZone),
    [block.teamId, today, timeZone]
  )
  const query = useTeamFixtures(input, online)
  const now = useCurrentTime()
  const matches = selectFormTrend(query.cached?.fixtures ?? [], input, block.matchLocation, now)
  const unknownResults = matches.filter(({ outcome }) => outcome === null).length
  const missingScores = matches.filter(
    ({ goalsFor, goalsAgainst }) => goalsFor === null || goalsAgainst === null
  ).length
  const hasExtraTime = matches.some(({ fixture }) => fixture.stateId === 7 || fixture.stateId === 8)
  const scope = block.matchLocation === 'all' ? '' : `${block.matchLocation} `

  return (
    <div className="space-y-2">
      <BlockError error={query.error} online={online} refresh={query.refresh} />
      {!query.cached?.query ? (
        <BlockPending
          block={block}
          online={online}
          error={query.error}
          loading={query.refreshing || query.cached === undefined}
        />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Form trend</CardTitle>
              <NativeSelect
                size="sm"
                aria-label="Form match location"
                value={block.matchLocation}
                onChange={(event) =>
                  onChange({
                    ...block,
                    matchLocation: event.target.value as FormTrendDefinition['matchLocation']
                  })
                }
              >
                <NativeSelectOption value="all">All matches</NativeSelectOption>
                <NativeSelectOption value="home">Home</NativeSelectOption>
                <NativeSelectOption value="away">Away</NativeSelectOption>
              </NativeSelect>
            </div>
            <p className="text-xs text-muted-foreground">
              Latest {matches.length || 'six'} completed {scope}
              {matches.length === 1 ? 'match' : 'matches'} · All competitions
            </p>
          </CardHeader>
          <CardContent>
            {matches.length ? (
              <>
                <dl className="mb-5 flex flex-wrap gap-x-7 gap-y-2" aria-label="Reported results">
                  {(['W', 'D', 'L'] as const).map((outcome) => (
                    <div key={outcome} className="flex items-baseline gap-2">
                      <dt className="order-2 text-xs text-muted-foreground">
                        {outcome === 'W' ? 'Won' : outcome === 'D' ? 'Drawn' : 'Lost'}
                      </dt>
                      <dd className="order-1 font-mono text-2xl tabular-nums">
                        {unknownResults === matches.length
                          ? '—'
                          : matches.filter((match) => match.outcome === outcome).length}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="view-form-body">
                  <FormGoalChart matches={matches} />
                  <ol className="view-form-results">
                    {matches.map((match) => (
                      <li key={match.fixture.id} className="min-w-0">
                        <FormResult
                          match={match}
                          teamId={block.teamId}
                          timeZone={timeZone}
                          date={today}
                        />
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            ) : (
              <p className="py-3 text-sm text-muted-foreground">
                No completed {scope}matches reported in this window.
              </p>
            )}
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              <p>
                Up to six matches · Last 100 days · {input.startDate} – {input.endDate}
              </p>
              {missingScores > 0 && (
                <p>
                  Scores incomplete for {missingScores} {missingScores === 1 ? 'match' : 'matches'};
                  missing goals shown as —.
                </p>
              )}
              {unknownResults > 0 && (
                <p>
                  {unknownResults} {unknownResults === 1 ? 'result' : 'results'} unknown.
                </p>
              )}
              {hasExtraTime && (
                <p>
                  Goals include extra time, excluding shootouts. Results include reported shootout
                  winners.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function FormGoalChart({ matches }: { matches: FormTrendMatch[] }): React.JSX.Element {
  const maximum = Math.max(
    2,
    ...matches.flatMap(({ goalsFor, goalsAgainst }) => [goalsFor ?? 0, goalsAgainst ?? 0])
  )
  return (
    <figure className="min-w-0">
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-sm bg-chart-2" />
          Scored
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-sm bg-chart-1" />
          Conceded
        </span>
      </div>
      <div className="view-form-chart" aria-hidden="true">
        <div className="view-form-axis font-mono text-[10px] tabular-nums text-muted-foreground">
          <span>{maximum}</span>
          <span>0</span>
        </div>
        <div className="view-form-plot">
          {matches.map((match) => (
            <div key={match.fixture.id} className="min-w-0 text-center">
              <div className="view-form-bars">
                {[match.goalsFor, match.goalsAgainst].map((value, index) => (
                  <div key={index} className="view-form-bar-track">
                    {value === null ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div
                        className={index === 0 ? 'bg-chart-2' : 'bg-chart-1'}
                        style={{ height: `${(value / maximum) * 100}%` }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 font-mono text-xs tabular-nums">
                {match.goalsFor ?? '—'}–{match.goalsAgainst ?? '—'}
              </p>
              <p className="mt-1 truncate text-[10px] text-muted-foreground">
                {match.opponent?.short_code ?? match.opponent?.name ?? 'Unknown'}
              </p>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-muted-foreground">
        Goals per match · Oldest to newest
      </figcaption>
    </figure>
  )
}

function FormResult({
  match,
  teamId,
  timeZone,
  date
}: {
  match: FormTrendMatch
  teamId: number
  timeZone: string
  date: string
}): React.JSX.Element {
  const { fixture, opponent, outcome, location, goalsFor, goalsAgainst } = match
  const matchDate = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone
  }).format(fixture.startingAt!)
  const phase =
    fixture.stateId === 8 ? 'After penalties' : fixture.stateId === 7 ? 'After extra time' : null
  return (
    <Link
      to="/fixtures/$fixtureId"
      params={{ fixtureId: String(fixture.id) }}
      search={{ team: teamId, competition: fixture.leagueId, season: fixture.seasonId, date }}
      aria-label={`${outcome ? outcomeLabels[outcome] : 'Result unknown'} ${location === 'away' ? 'away to' : location === 'home' ? 'home to' : 'against'} ${opponent?.name ?? 'unknown opponent'}, ${matchDate}, goals scored ${goalsFor ?? 'unknown'}, conceded ${goalsAgainst ?? 'unknown'}${phase ? `, ${phase}` : ''}`}
      className="flex items-center gap-2.5 rounded-md p-2 outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-sm font-mono text-xs ${outcome ? outcomeColors[outcome] : 'bg-muted text-muted-foreground'}`}
      >
        {outcome ?? '—'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium break-words">{opponent?.name ?? 'Unknown opponent'}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {matchDate} ·{' '}
          {location === 'home' ? 'Home' : location === 'away' ? 'Away' : 'Location unknown'} ·{' '}
          {fixture.raw.league?.name ?? `Competition ${fixture.leagueId}`}
          {phase ? ` · ${phase}` : ''}
        </p>
      </div>
      <span className="shrink-0 font-mono text-sm tabular-nums" aria-hidden="true">
        {goalsFor ?? '—'}–{goalsAgainst ?? '—'}
      </span>
    </Link>
  )
}
