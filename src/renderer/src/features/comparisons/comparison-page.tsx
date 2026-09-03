import { useEffect } from 'react'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { ArrowLeftRight } from 'lucide-react'
import type { StatisticSeasonRecord } from '@shared/contracts'
import { Button } from '@/components/ui/button'
import { EntitySubpageNavigation } from '@/components/entity-subpage-navigation'
import { entitySubpageNavigationItemClassName } from '@/components/entity-subpage-navigation-variants'
import { useOnline } from '@/lib/use-online'
import { ComparisonPicker } from './comparison-picker'
import { ComparisonSeasonPicker } from './comparison-season-picker'
import { PlayerComparisonStatistics, TeamComparisonStatistics } from './comparison-statistics'
import { useComparisonSeason } from './use-comparison-season'
import type { ComparisonKind } from './comparison-data'

export function ComparisonPage({
  kind = 'teams',
  left,
  right,
  leftSeason,
  rightSeason,
  leftTeam,
  rightTeam
}: {
  kind?: ComparisonKind
  left?: number
  right?: number
  leftSeason?: number
  rightSeason?: number
  leftTeam?: number
  rightTeam?: number
}): React.JSX.Element {
  const online = useOnline()
  const navigate = useNavigate({ from: '/compare' })
  const router = useRouter()
  const first = useComparisonSeason(kind, left, leftSeason, leftTeam, online)
  const second = useComparisonSeason(kind, right, rightSeason, rightTeam, online)
  useEffect(() => {
    const latest = router.latestLocation
    const search = latest.search
    if (
      latest.pathname !== '/compare' ||
      (search.kind ?? 'teams') !== kind ||
      search.left !== left ||
      search.right !== right ||
      search.leftSeason !== leftSeason ||
      search.rightSeason !== rightSeason ||
      search.leftTeam !== leftTeam ||
      search.rightTeam !== rightTeam
    )
      return
    const nextLeftSeason = first.selected?.season.id ?? leftSeason
    const nextRightSeason = second.selected?.season.id ?? rightSeason
    const nextLeftTeam = kind === 'players' ? (first.selected?.teamId ?? leftTeam) : undefined
    const nextRightTeam = kind === 'players' ? (second.selected?.teamId ?? rightTeam) : undefined
    if (
      nextLeftSeason === leftSeason &&
      nextRightSeason === rightSeason &&
      nextLeftTeam === leftTeam &&
      nextRightTeam === rightTeam
    )
      return
    void navigate({
      replace: true,
      search: {
        ...search,
        leftSeason: nextLeftSeason,
        rightSeason: nextRightSeason,
        leftTeam: nextLeftTeam,
        rightTeam: nextRightTeam
      }
    })
  }, [
    router,
    navigate,
    kind,
    left,
    right,
    leftSeason,
    rightSeason,
    leftTeam,
    rightTeam,
    first.selected,
    second.selected
  ])
  const contexts = { left: first, right: second }
  const selectRecord = (side: 'left' | 'right', record: StatisticSeasonRecord): void => {
    void navigate({
      search: (previous) => ({
        ...previous,
        [side === 'left' ? 'leftSeason' : 'rightSeason']: record.season.id,
        [side === 'left' ? 'leftTeam' : 'rightTeam']: kind === 'players' ? record.teamId : undefined
      })
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-7 lg:p-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Compare</h1>
      </header>
      <EntitySubpageNavigation aria-label="Comparison type" className="border-b">
        {(['teams', 'players'] as const).map((value) => (
          <Link
            key={value}
            to="/compare"
            search={{ kind: value }}
            aria-current={kind === value ? 'page' : undefined}
            className={entitySubpageNavigationItemClassName(kind === value)}
          >
            {value === 'teams' ? 'Teams' : 'Players'}
          </Link>
        ))}
      </EntitySubpageNavigation>
      <div className="relative grid gap-3 sm:grid-cols-2 sm:gap-12">
        {(['left', 'right'] as const).map((side) => {
          const context = contexts[side]
          const label = side === 'left' ? 'First' : 'Second'
          const id = side === 'left' ? left : right
          return (
            <ComparisonPicker
              key={`${kind}:${side}`}
              side={label}
              kind={kind}
              id={id}
              clubId={context.selected?.teamId}
              online={online}
              competitionId={context.selected?.season.league_id}
              seasonId={context.selected?.season.id}
              onSelect={(id) =>
                void navigate({
                  search: (previous) => ({
                    ...previous,
                    kind,
                    [side]: id,
                    [side === 'left' ? 'leftTeam' : 'rightTeam']: undefined,
                    [side === 'left' ? 'leftSeason' : 'rightSeason']: undefined
                  })
                })
              }
            >
              {id && (
                <ComparisonSeasonPicker
                  side={label}
                  kind={kind}
                  context={context}
                  online={online}
                  onSelect={(record) => selectRecord(side, record)}
                />
              )}
            </ComparisonPicker>
          )
        })}
        <Button
          className="justify-self-center sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2"
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
                leftTeam: kind === 'players' ? (second.selected?.teamId ?? rightTeam) : undefined,
                rightTeam: kind === 'players' ? (first.selected?.teamId ?? leftTeam) : undefined,
                leftSeason: second.selected?.season.id ?? rightSeason,
                rightSeason: first.selected?.season.id ?? leftSeason
              })
            })
          }
        >
          <ArrowLeftRight className="size-4" />
        </Button>
      </div>
      {left && right && first.selected && second.selected ? (
        kind === 'teams' ? (
          <TeamComparisonStatistics
            left={left}
            right={right}
            leftSeasonId={first.selected.season.id}
            rightSeasonId={second.selected.season.id}
            online={online}
          />
        ) : (
          <PlayerComparisonStatistics
            left={left}
            right={right}
            leftSeasonId={first.selected.season.id}
            rightSeasonId={second.selected.season.id}
            leftContext={`${first.selected.teamName} · ${first.selected.competitionName} · ${first.selected.season.name}`}
            rightContext={`${second.selected.teamName} · ${second.selected.competitionName} · ${second.selected.season.name}`}
            online={online}
            leftTeam={first.selected.teamId}
            rightTeam={second.selected.teamId}
          />
        )
      ) : !left || !right ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Choose two {kind} to compare
        </p>
      ) : null}
    </div>
  )
}
