import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Trophy } from 'lucide-react'
import type { CachedFixture, readSeasonBracket, readSeasonSchedule } from '@/data/db'
import { Card, CardContent } from '@/components/ui/card'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { TeamLogo } from '@/features/teams/team-logo'
import { currentFixtureScore, fixtureParticipantAt } from '@/lib/fixture'
import { fixtureProgressLabel, isFixtureLive } from '@/lib/fixture-state'
import { FixtureLiveIndicator } from '@/features/fixtures/fixture-live-indicator'
import { cn } from '@/lib/utils'
import {
  knockoutProgression,
  knockoutRounds,
  type KnockoutProgression,
  type KnockoutTie
} from './knockout-data'

export function KnockoutBracket({
  schedule,
  bracket,
  loading,
  online,
  competitionId,
  seasonId
}: {
  schedule: Awaited<ReturnType<typeof readSeasonSchedule>> | undefined
  bracket: Awaited<ReturnType<typeof readSeasonBracket>> | undefined
  loading: boolean
  online: boolean
  competitionId: number
  seasonId: number | null
}): React.JSX.Element {
  const rounds = useMemo(() => knockoutRounds(schedule, bracket), [schedule, bracket])
  const [fromRound, setFromRound] = useState<number | null>(null)
  const selectedRoundIndex = rounds.findIndex((round) => round.id === fromRound)
  const startIndex = selectedRoundIndex >= 0 ? selectedRoundIndex : Math.max(0, rounds.length - 3)
  const visibleRounds = rounds.slice(startIndex, startIndex + 3)
  const links = useMemo(
    () => knockoutProgression(rounds, bracket?.edges ?? []),
    [rounds, bracket?.edges]
  )
  const canvas = useRef<HTMLDivElement>(null)
  const [paths, setPaths] = useState<{ d: string; loser: boolean }[]>([])
  useLayoutEffect(() => {
    const element = canvas.current
    if (!element) return
    const measure = (): void => {
      const origin = element.getBoundingClientRect()
      const boxes = new Map(
        [...element.querySelectorAll<HTMLElement>('[data-tie-id]')].map((node) => [
          node.dataset.tieId,
          node.getBoundingClientRect()
        ])
      )
      const next = links.flatMap((link) => {
        const from = boxes.get(link.parentTieId)
        const to = boxes.get(link.childTieId)
        if (!from || !to) return []
        const x1 = from.right - origin.left
        const y1 = from.top + from.height / 2 - origin.top
        const x2 = to.left - origin.left
        const y2 = to.top + to.height / 2 - origin.top
        const middle = (x1 + x2) / 2
        return [{ d: `M ${x1} ${y1} H ${middle} V ${y2} H ${x2}`, loser: link.outcome === 'loser' }]
      })
      setPaths((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [links, rounds, startIndex])

  if (!rounds.length)
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {loading || bracket === undefined
            ? 'Loading knockout rounds…'
            : !bracket && !online
              ? 'Knockout rounds are not available offline'
              : 'No knockout rounds reported for this season'}
        </CardContent>
      </Card>
    )

  const roundByTie = new Map(
    rounds.flatMap((round) => round.ties.map((tie) => [tie.id, round.name] as const))
  )
  return (
    <section aria-label="Knockout bracket" className="flex min-w-0 flex-col gap-3">
      {rounds.length > 3 && (
        <div className="flex items-center justify-between gap-3">
          <NativeSelect
            aria-label="Bracket starting round"
            value={rounds[startIndex]?.id}
            onChange={(event) => setFromRound(Number(event.target.value))}
          >
            {rounds.map((round) => (
              <NativeSelectOption key={round.id} value={round.id}>
                {round.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <span className="text-xs text-muted-foreground">{visibleRounds.at(-1)?.name}</span>
        </div>
      )}
      {!links.length && (
        <p className="text-xs text-muted-foreground">
          Advancement paths have not been reported yet.
        </p>
      )}
      <div className="overflow-x-auto pb-3" tabIndex={0} aria-label="Tournament rounds">
        <div
          ref={canvas}
          className="relative grid w-max min-w-full auto-cols-[17rem] grid-flow-col gap-10"
        >
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible text-border"
          >
            {paths.map((path, index) => (
              <path
                key={index}
                d={path.d}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={path.loser ? '4 4' : undefined}
              />
            ))}
          </svg>
          {visibleRounds.map((round) => (
            <section
              key={round.id}
              aria-label={round.name}
              className="relative flex flex-col gap-4"
            >
              <h2 className="text-sm font-semibold">{round.name}</h2>
              <div className="flex flex-1 flex-col justify-around gap-4">
                {round.ties.map((tie) => (
                  <KnockoutTieCard
                    key={tie.id}
                    tie={tie}
                    online={online}
                    competitionId={competitionId}
                    seasonId={seasonId}
                    next={links
                      .filter((link) => link.parentTieId === tie.id)
                      .map((link) => ({ ...link, name: roundByTie.get(link.childTieId)! }))}
                  />
                ))}
                {!round.ties.length && (
                  <Card className="p-4 text-sm text-muted-foreground">
                    {!schedule
                      ? loading
                        ? 'Loading fixtures…'
                        : 'Fixtures unavailable'
                      : 'No fixtures reported'}
                  </Card>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  )
}

function KnockoutTieCard({
  tie,
  online,
  competitionId,
  seasonId,
  next
}: {
  tie: KnockoutTie
  online: boolean
  competitionId: number
  seasonId: number | null
  next: (KnockoutProgression & { name: string })[]
}): React.JSX.Element {
  const winner = tie.fixtures
    .flatMap((fixture) => fixture.raw.participants)
    .find((participant) => participant.id === tie.winnerId)
  return (
    <Card data-tie-id={tie.id} className="gap-0 overflow-hidden py-0">
      {tie.fixtures.map((fixture, index) => (
        <BracketFixture
          key={fixture.id}
          fixture={fixture}
          online={online}
          competitionId={competitionId}
          seasonId={seasonId}
          leg={tie.fixtures.length > 1 ? index + 1 : undefined}
        />
      ))}
      {(tie.aggregate?.result || winner) && (
        <div className="border-t bg-muted/30 px-3 py-2 text-xs">
          {tie.aggregate?.result && (
            <p>
              <span className="text-muted-foreground">{tie.aggregate.name} · Agg. </span>
              <span className="font-mono tabular-nums">{tie.aggregate.result}</span>
            </p>
          )}
          {winner && (
            <p className="flex items-center gap-1.5 font-medium">
              <Trophy className="size-3 text-primary" />
              Winner: {winner.name}
            </p>
          )}
        </div>
      )}
      {!!next.length && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 border-t px-3 py-2">
          {next.map((link) => (
            <Link
              key={`${link.childTieId}:${link.outcome}`}
              to="/fixtures/$fixtureId"
              params={{ fixtureId: String(link.childFixtureId) }}
              search={{ competition: competitionId, season: seasonId ?? undefined }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              {link.outcome === 'loser' ? 'Loser' : 'Winner'} <ArrowRight className="size-3" />
              {link.name}
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}

function BracketFixture({
  fixture,
  online,
  competitionId,
  seasonId,
  leg
}: {
  fixture: CachedFixture
  online: boolean
  competitionId: number
  seasonId: number | null
  leg?: number
}): React.JSX.Element {
  const score = currentFixtureScore(fixture.raw)
  const date =
    fixture.startingAt === null
      ? 'Date TBC'
      : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(
          fixture.startingAt
        )
  return (
    <Link
      to="/fixtures/$fixtureId"
      params={{ fixtureId: String(fixture.id) }}
      search={{ competition: competitionId, season: seasonId ?? undefined }}
      className="block border-b px-3 py-2.5 last:border-b-0 hover:bg-sidebar-accent"
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {date}
          {leg ? ` · Leg ${leg}` : ''}
        </span>
        <span
          className={cn(
            'flex items-center gap-1.5 font-mono tabular-nums',
            isFixtureLive(fixture.stateId) && 'text-success-emphasis'
          )}
        >
          {isFixtureLive(fixture.stateId) && <FixtureLiveIndicator showLabel={false} />}
          {fixtureProgressLabel(fixture.raw) ??
            fixture.raw.state?.short_name ??
            ([5, 7, 8].includes(fixture.stateId) ? 'FT' : '')}
        </span>
      </div>
      {(['home', 'away'] as const).map((side) => {
        const team = fixtureParticipantAt(fixture.raw, side)
        return (
          <div
            key={side}
            className={cn(
              'flex items-center gap-2 py-0.5 text-sm',
              team?.meta?.winner && 'font-semibold'
            )}
          >
            <TeamLogo
              className="size-5 shrink-0"
              imagePath={team?.placeholder ? null : (team?.image_path ?? null)}
              online={online}
            />
            <span className="min-w-0 flex-1 truncate">
              {team?.placeholder ? 'TBC' : (team?.name ?? 'TBC')}
            </span>
            <span className="font-mono tabular-nums">{score[side] ?? '–'}</span>
          </div>
        )
      })}
      {fixture.placeholder && fixture.name && fixture.name !== 'TBC vs TBC' && (
        <p className="mt-2 text-xs text-muted-foreground">{fixture.name}</p>
      )}
      {(fixture.stateId === 7 || fixture.stateId === 8) && fixture.resultInfo && (
        <p className="mt-2 text-xs text-muted-foreground">{fixture.resultInfo}</p>
      )}
    </Link>
  )
}
