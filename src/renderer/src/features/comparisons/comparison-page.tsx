import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { EntitySubpageNavigation } from '@/components/entity-subpage-navigation'
import { entitySubpageNavigationItemClassName } from '@/components/entity-subpage-navigation-variants'
import { ErrorAlert } from '@/components/error-alert'
import { useCompetitions } from '@/features/competitions/use-competitions'
import { useCompetitionSeasons } from '@/features/competitions/use-competition-workspace'
import {
  competitionSeasonOptions,
  selectedCompetitionSeason
} from '@/features/competitions/competition-workspace-data'
import { useOnline } from '@/lib/use-online'
import { ComparisonPicker } from './comparison-picker'
import { PlayerComparisonStatistics, TeamComparisonStatistics } from './comparison-statistics'
import type { ComparisonKind } from './comparison-data'

export function ComparisonPage({
  kind = 'teams',
  competition,
  season,
  left,
  right,
  leftTeam,
  rightTeam
}: {
  kind?: ComparisonKind
  competition?: number
  season?: number
  left?: number
  right?: number
  leftTeam?: number
  rightTeam?: number
}): React.JSX.Element {
  const online = useOnline()
  const navigate = useNavigate({ from: '/compare' })
  const catalog = useCompetitions(online)
  const competitions = catalog.cached?.competitions ?? []
  const selectedCompetition =
    competitions.find(({ id }) => id === competition) ?? (competition ? null : competitions[0])
  const competitionId = selectedCompetition?.id
  const seasons = useCompetitionSeasons(competitionId ?? null, online)
  const options = competitionSeasonOptions(
    seasons.cached?.seasons ?? [],
    selectedCompetition?.raw.currentseason
  )
  const selectedSeason = season
    ? options.find(({ id }) => id === season)
    : selectedCompetitionSeason(options)
  const seasonId = selectedSeason?.id
  const select = (side: 'left' | 'right', id: number): void => {
    void navigate({
      search: (previous) => ({
        ...previous,
        kind,
        competition: competitionId,
        season: seasonId,
        [side]: id,
        [side === 'left' ? 'leftTeam' : 'rightTeam']: undefined
      })
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-7 lg:p-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Compare</h1>
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect
            aria-label="Comparison competition"
            value={competitionId ?? ''}
            onChange={(event) =>
              void navigate({
                search: (previous) => ({
                  ...previous,
                  competition: Number(event.target.value),
                  season: undefined,
                  leftTeam: undefined,
                  rightTeam: undefined
                })
              })
            }
          >
            {!competitionId && <NativeSelectOption value="">Choose competition</NativeSelectOption>}
            {competitions.map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {item.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Comparison season"
            value={seasonId ?? ''}
            disabled={!options.length}
            onChange={(event) =>
              void navigate({
                search: (previous) => ({
                  ...previous,
                  competition: competitionId,
                  season: Number(event.target.value),
                  leftTeam: undefined,
                  rightTeam: undefined
                })
              })
            }
          >
            {!options.length && <NativeSelectOption value="">Season</NativeSelectOption>}
            {options.map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {item.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </header>
      <EntitySubpageNavigation aria-label="Comparison type" className="border-b">
        {(['teams', 'players'] as const).map((value) => (
          <Link
            key={value}
            to="/compare"
            search={{ kind: value, competition: competitionId, season: seasonId }}
            aria-current={kind === value ? 'page' : undefined}
            className={entitySubpageNavigationItemClassName(kind === value)}
          >
            {value === 'teams' ? 'Teams' : 'Players'}
          </Link>
        ))}
      </EntitySubpageNavigation>
      {(catalog.error || seasons.error) && (
        <ErrorAlert>{catalog.error ?? seasons.error}</ErrorAlert>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <ComparisonPicker
          key={`${kind}:left`}
          side="First"
          clubId={leftTeam}
          kind={kind}
          id={left}
          excludedId={right}
          online={online}
          competitionId={competitionId}
          seasonId={seasonId}
          onSelect={(id) => select('left', id)}
        />
        <Button
          aria-label="Swap selections"
          size="icon"
          variant="ghost"
          disabled={!left && !right}
          onClick={() =>
            void navigate({
              search: (previous) => ({
                ...previous,
                left: right,
                right: left,
                leftTeam: rightTeam,
                rightTeam: leftTeam
              })
            })
          }
        >
          <ArrowLeftRight className="size-4" />
        </Button>
        <ComparisonPicker
          key={`${kind}:right`}
          side="Second"
          clubId={rightTeam}
          kind={kind}
          id={right}
          excludedId={left}
          online={online}
          competitionId={competitionId}
          seasonId={seasonId}
          onSelect={(id) => select('right', id)}
        />
      </div>
      {left && right && seasonId ? (
        kind === 'teams' ? (
          <TeamComparisonStatistics left={left} right={right} seasonId={seasonId} online={online} />
        ) : (
          <PlayerComparisonStatistics
            left={left}
            right={right}
            seasonId={seasonId}
            online={online}
            leftTeam={leftTeam}
            rightTeam={rightTeam}
            onClubChange={(side, id) =>
              void navigate({
                search: (previous) => ({
                  ...previous,
                  [side === 'left' ? 'leftTeam' : 'rightTeam']: id
                })
              })
            }
          />
        )
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {!seasonId ? 'Choose a competition and season' : `Choose two ${kind} to compare`}
        </p>
      )}
    </div>
  )
}
