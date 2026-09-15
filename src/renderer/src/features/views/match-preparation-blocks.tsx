import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { CloudSun } from 'lucide-react'
import type { ViewBlock, FixtureSourceBlock } from '@shared/views'
import type { CachedFixture } from '@/data/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fixtureParticipantAt } from '@/lib/fixture'
import { currentTimeZone } from '@/lib/date'
import { useCurrentTime } from '@/lib/use-current-time'
import { EntityFixtureRow } from '@/features/fixtures/entity-fixture-panel'
import { recentHeadToHead } from '@/features/fixtures/fixture-preview-data'
import { FixtureAbsenceRow } from '@/features/fixtures/fixture-absences'
import { fixtureWeather } from '@/features/fixtures/fixture-weather-data'
import { useFixtureEntity, useFixtureHeadToHead } from '@/features/fixtures/use-fixtures'
import { LinkedMatchView } from './linked-match-view'
import { BlockEmpty, BlockError, BlockPending } from './view-block-state'

type MatchPreparationBlock = Extract<
  ViewBlock,
  { type: 'fixture-head-to-head' | 'fixture-absences' | 'fixture-weather' }
>
type MatchProps = {
  block: MatchPreparationBlock
  fixture: CachedFixture
  online: boolean
  date: string
}

export function MatchPreparationBlockContent({
  block,
  source
}: {
  block: MatchPreparationBlock
  source: FixtureSourceBlock
}): React.JSX.Element {
  return (
    <LinkedMatchView block={block} source={source}>
      {(fixture, online, date) =>
        block.type === 'fixture-head-to-head' ? (
          <HeadToHead
            key={fixture.id}
            block={block}
            fixture={fixture}
            online={online}
            date={date}
          />
        ) : (
          <MatchDetails
            key={fixture.id}
            block={block}
            fixture={fixture}
            online={online}
            date={date}
          />
        )
      }
    </LinkedMatchView>
  )
}

function MatchLink({ fixture, date }: { fixture: CachedFixture; date: string }): React.JSX.Element {
  return (
    <Link
      to="/fixtures/$fixtureId/preview"
      params={{ fixtureId: String(fixture.id) }}
      search={{ competition: fixture.leagueId, season: fixture.seasonId, date }}
      className="text-sm font-medium wrap-anywhere hover:text-primary"
    >
      {fixture.name ?? fixture.raw.participants.map((team) => team.name).join(' vs ')}
    </Link>
  )
}

function HeadToHead({ block, fixture, online, date }: MatchProps): React.JSX.Element {
  const timeZone = useMemo(() => currentTimeZone(), [])
  const now = useCurrentTime()
  const input = useMemo(
    () =>
      fixture.homeTeamId !== null && fixture.awayTeamId !== null
        ? { firstTeamId: fixture.homeTeamId, secondTeamId: fixture.awayTeamId, timeZone }
        : null,
    [fixture.homeTeamId, fixture.awayTeamId, timeZone]
  )
  const query = useFixtureHeadToHead(input, online)
  const pair =
    query.cached?.fixtures.filter(
      (meeting) =>
        (meeting.homeTeamId === fixture.homeTeamId && meeting.awayTeamId === fixture.awayTeamId) ||
        (meeting.homeTeamId === fixture.awayTeamId && meeting.awayTeamId === fixture.homeTeamId)
    ) ?? []
  const meetings = recentHeadToHead(pair, fixture.id, Math.min(now, fixture.startingAt ?? now))
  if (!input)
    return <BlockEmpty>Both match participants are needed for previous meetings.</BlockEmpty>
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
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Head-to-head</CardTitle>
            <MatchLink fixture={fixture} date={date} />
            <p className="text-xs text-muted-foreground">
              Last five completed meetings · All competitions
            </p>
          </CardHeader>
          {meetings.length ? (
            <div className="grid grid-cols-1 gap-6 @min-[520px]/view-widget:grid-cols-2 @min-[860px]/view-widget:grid-cols-3 pb-2">
              {meetings.map((meeting) => (
                <EntityFixtureRow
                  key={meeting.id}
                  fixture={meeting}
                  context={{ date, competition: meeting.leagueId }}
                  online={online}
                  dateDisplay="historical"
                  fixtureSeasonLinks
                  showCompetition
                />
              ))}
            </div>
          ) : (
            <CardContent className="text-sm text-muted-foreground">
              No completed previous meetings reported.
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}

function MatchDetails({ block, fixture, online, date }: MatchProps): React.JSX.Element {
  const query = useFixtureEntity(fixture.id, online)
  const details = query.cached?.fixture
  const hasData =
    block.type === 'fixture-absences'
      ? details?.raw.sidelined !== undefined
      : details?.raw.weatherreport !== undefined
  return (
    <div className="space-y-2">
      <BlockError error={query.error} online={online} refresh={query.refresh} />
      {!hasData && !details?.detailStaleAt ? (
        <BlockPending
          block={block}
          online={online}
          error={query.error}
          loading={query.refreshing || query.cached === undefined || online}
        />
      ) : block.type === 'fixture-absences' ? (
        <MatchAbsences fixture={details ?? fixture} online={online} date={date} />
      ) : (
        <MatchWeather fixture={details ?? fixture} date={date} />
      )}
    </div>
  )
}

function MatchAbsences({ fixture, online, date }: Omit<MatchProps, 'block'>): React.JSX.Element {
  const teams = (['home', 'away'] as const).flatMap((side) => {
    const team = fixtureParticipantAt(fixture.raw, side)
    return team ? [team] : []
  })
  const absences = fixture.raw.sidelined
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Match absences</CardTitle>
        <MatchLink fixture={fixture} date={date} />
      </CardHeader>
      {absences === undefined || teams.length !== 2 ? (
        <CardContent className="text-sm text-muted-foreground">
          Match absence data unavailable.
        </CardContent>
      ) : (
        <div className="grid grid-cols-1 gap-6 @min-[520px]/view-widget:grid-cols-2 pb-2">
          {teams.map((team) => {
            const reported = absences.filter(
              (absence) => absence.participant_id === team.id && absence.fixture_id === fixture.id
            )
            return (
              <section key={team.id} aria-label={`${team.name} match absences`} className="min-w-0">
                <h3 className="px-4 pb-3 text-sm font-semibold wrap-anywhere">{team.name}</h3>
                {reported.length ? (
                  <div className="@min-[860px]/view-widget:grid @min-[860px]/view-widget:grid-cols-2">
                    {reported.map((absence) => (
                      <FixtureAbsenceRow
                        key={absence.id}
                        absence={absence}
                        online={online}
                        context={{
                          competition: fixture.leagueId,
                          season: fixture.seasonId,
                          date,
                          team: team.id
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="px-4 pb-4 text-sm text-muted-foreground">No absences reported.</p>
                )}
              </section>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function MatchWeather({
  fixture,
  date
}: {
  fixture: CachedFixture
  date: string
}): React.JSX.Element {
  const weather = fixtureWeather(
    fixture.raw.weatherreport?.fixture_id === fixture.id ? fixture.raw.weatherreport : null
  )
  const facts = weather
    ? [
        { label: 'Feels like', value: weather.feelsLike },
        { label: 'Humidity', value: weather.humidity },
        { label: 'Cloud cover', value: weather.clouds },
        ...weather.periods.map((period) => ({ label: period.label, value: period.temperature }))
      ]
    : []
  return (
    <Card>
      <CardHeader>
        <CardTitle>Match weather</CardTitle>
        <MatchLink fixture={fixture} date={date} />
        {weather && (
          <p className="text-xs text-muted-foreground">
            {weather.label ?? 'Report type not specified'} · Sportmonks
          </p>
        )}
      </CardHeader>
      <CardContent>
        {!weather ? (
          <p className="text-sm text-muted-foreground">
            No weather report available for this match.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 @min-[860px]/view-widget:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] @min-[860px]/view-widget:items-center">
            <div className="flex items-center gap-3">
              <CloudSun className="size-8 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0">
                <p className="font-mono text-3xl tabular-nums">{weather.temperature ?? '—'}</p>
                <p className="mt-1 text-sm text-muted-foreground wrap-anywhere">
                  {weather.description ?? 'Conditions not reported'}
                </p>
                {!weather.temperature && !weather.periods.length && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Temperature or its unit is not reported.
                  </p>
                )}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-6 @min-[520px]/view-widget:grid-cols-3">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                  <dd className="mt-1 font-mono text-lg tabular-nums">{fact.value ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
