import { useEffect, useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { LoaderCircle, Search } from 'lucide-react'
import type { CachedFixture, EntitySearchResult, EntitySearchResultType } from '@/data/db'
import { Button } from '@/components/ui/button'
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CoachPhoto } from '@/features/coaches/coach-photo'
import { prefetchCoachEntity } from '@/features/coaches/use-coach'
import { CompetitionLogo } from '@/features/competitions/competition-logo'
import { prefetchCompetitionWorkspace } from '@/features/competitions/use-competition-workspace'
import { PlayerPhoto } from '@/features/players/player-photo'
import { prefetchPlayerEntity } from '@/features/players/use-player'
import { prefetchRefereeEntity } from '@/features/referees/use-referee'
import { prefetchFixtureEntity } from '@/features/fixtures/use-fixtures'
import { FixtureLiveIndicator } from '@/features/fixtures/fixture-live-indicator'
import { TeamLogo } from '@/features/teams/team-logo'
import { prefetchTeamEntity } from '@/features/teams/use-team'
import { VenueImage } from '@/features/venues/venue-image'
import { prefetchVenueEntity } from '@/features/venues/use-venue'
import { intentPrefetchProps, startPrefetch } from '@/lib/prefetch'
import { cn } from '@/lib/utils'
import { formatFixtureTime } from '@/lib/date'
import { currentFixtureScore, fixtureParticipantAt } from '@/lib/fixture'
import { fixtureRowStatus } from '@/lib/fixture-state'
import { useEntitySearch } from './use-entity-search'

const groupLabels: Record<EntitySearchResultType, string> = {
  competition: 'Competitions',
  team: 'Teams',
  fixture: 'Matches',
  player: 'Players',
  coach: 'Coaches',
  referee: 'Referees',
  venue: 'Venues'
}

export function EntitySearchPalette({ online }: { online: boolean }): React.JSX.Element {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const keyboardSelection = useRef(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('')
  const { results, searching, error } = useEntitySearch(query, open, online)
  const hasQuery = query.trim().length > 0

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }

    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [])

  function changeOpen(nextOpen: boolean): void {
    setOpen(nextOpen)
    if (!nextOpen) {
      setQuery('')
      setSelected('')
    }
  }

  async function openResult(result: EntitySearchResult): Promise<void> {
    changeOpen(false)

    if (result.type === 'fixture') {
      await router.navigate({
        to: '/fixtures/$fixtureId',
        params: { fixtureId: String(result.id) },
        search: { competition: result.fixture?.leagueId, season: result.fixture?.seasonId }
      })
      return
    }

    if (result.type === 'referee') {
      await router.navigate({
        to: '/referees/$refereeId',
        params: { refereeId: String(result.id) },
        search: {}
      })
      return
    }

    if (result.type === 'competition') {
      await router.navigate({
        to: '/competitions/$competitionId',
        params: { competitionId: String(result.id) }
      })
      return
    }

    if (result.type === 'team') {
      await router.navigate({
        to: '/teams/$teamId',
        params: { teamId: String(result.id) },
        search: {}
      })
      return
    }

    if (result.type === 'player') {
      await router.navigate({
        to: '/players/$playerId',
        params: { playerId: String(result.id) },
        search: { competition: undefined, date: undefined, season: undefined, team: undefined }
      })
      return
    }

    if (result.type === 'coach') {
      await router.navigate({
        to: '/coaches/$coachId',
        params: { coachId: String(result.id) },
        search: { competition: undefined, date: undefined, season: undefined, team: undefined }
      })
      return
    }

    await router.navigate({
      to: '/venues/$venueId',
      params: { venueId: String(result.id) },
      search: { competition: undefined, team: undefined }
    })
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger
        render={
          <Button
            ref={triggerRef}
            variant="ghost"
            className="h-auto w-full justify-start gap-3 px-3 py-2 text-left text-muted-foreground hover:bg-muted/70 hover:text-foreground active:scale-100"
          />
        }
      >
        <Search className="size-4" />
        <span>Search</span>
        <kbd
          aria-hidden="true"
          className="ml-auto rounded border bg-background px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground"
        >
          ⌘K
        </kbd>
      </DialogTrigger>

      <DialogContent initialFocus={inputRef} finalFocus={triggerRef}>
        <DialogTitle className="sr-only">Search Halfspace</DialogTitle>
        <Command
          shouldFilter={false}
          value={selected}
          onKeyDownCapture={() => {
            keyboardSelection.current = true
          }}
          onPointerMove={() => {
            keyboardSelection.current = false
          }}
          onValueChange={(value) => {
            setSelected(value)
            const result = results.find((item) => `${item.type}-${item.id}` === value)
            if (keyboardSelection.current && online && result) {
              startPrefetch(() => prefetchSearchResult(result))
            }
          }}
        >
          <div className={cn('flex items-center gap-3 px-4', hasQuery && 'border-b')}>
            <Search className="size-5 shrink-0 text-muted-foreground" />
            <CommandInput
              ref={inputRef}
              aria-expanded={hasQuery}
              aria-label="Search matches, competitions, teams, players, coaches, referees, and venues"
              autoComplete="off"
              placeholder="Search football…"
              value={query}
              onValueChange={(value) => {
                setQuery(value)
                setSelected('')
              }}
            />
            {searching && (
              <LoaderCircle
                aria-label="Searching Sportmonks"
                className="size-4 shrink-0 animate-spin text-muted-foreground"
              />
            )}
            <kbd
              aria-hidden="true"
              className="rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground"
            >
              Esc
            </kbd>
          </div>

          {hasQuery && (
            <CommandList>
              {results.map((result, index) => {
                const previousType = results[index - 1]?.type

                return (
                  <div key={`${result.type}-${result.id}`}>
                    {result.type !== previousType && (
                      <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {groupLabels[result.type]}
                      </p>
                    )}
                    <CommandItem
                      value={`${result.type}-${result.id}`}
                      onSelect={() => void openResult(result)}
                      {...intentPrefetchProps(online, () => prefetchSearchResult(result))}
                    >
                      <ResultImage online={online} result={result} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{result.name}</span>
                        {result.subtitle && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {result.subtitle}
                          </span>
                        )}
                      </span>
                      {result.fixture && <MatchSummary fixture={result.fixture} />}
                    </CommandItem>
                  </div>
                )
              })}

              {!searching && results.length === 0 && !error && (
                <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No results for “{query.trim()}”.
                </p>
              )}
              {error && <p className="px-3 py-3 text-center text-sm text-destructive">{error}</p>}
            </CommandList>
          )}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

async function prefetchSearchResult(result: EntitySearchResult): Promise<void> {
  if (result.type === 'fixture') {
    await prefetchFixtureEntity(result.id)
    return
  }

  if (result.type === 'referee') {
    await prefetchRefereeEntity(result.id)
    return
  }
  if (result.type === 'competition') {
    await prefetchCompetitionWorkspace(result.id)
    return
  }

  if (result.type === 'team') {
    await prefetchTeamEntity(result.id)
    return
  }

  if (result.type === 'player') {
    await prefetchPlayerEntity(result.id)
    return
  }

  if (result.type === 'coach') {
    await prefetchCoachEntity(result.id)
    return
  }

  await prefetchVenueEntity(result.id)
}

function ResultImage({
  online,
  result
}: {
  online: boolean
  result: EntitySearchResult
}): React.JSX.Element {
  const className = 'size-9 rounded-lg bg-background'
  const fixture = result.fixture

  if (fixture) {
    return (
      <span className="flex w-9 shrink-0 flex-col items-center -space-y-2">
        {(['home', 'away'] as const).map((side) => (
          <TeamLogo
            key={side}
            className="size-6 bg-background"
            imagePath={fixtureParticipantAt(fixture.raw, side)?.image_path ?? null}
            online={online}
          />
        ))}
      </span>
    )
  }

  if (result.type === 'competition') {
    return <CompetitionLogo className={className} imagePath={result.imagePath} online={online} />
  }

  if (result.type === 'team') {
    return <TeamLogo className={className} imagePath={result.imagePath} online={online} />
  }

  if (result.type === 'player' || result.type === 'referee') {
    return (
      <PlayerPhoto className="size-9 rounded-full" imagePath={result.imagePath} online={online} />
    )
  }

  if (result.type === 'coach') {
    return (
      <CoachPhoto className="size-9 rounded-full" imagePath={result.imagePath} online={online} />
    )
  }

  return <VenueImage className="size-9 rounded-lg" imagePath={result.imagePath} online={online} />
}

function MatchSummary({ fixture }: { fixture: CachedFixture }): React.JSX.Element {
  const status = fixtureRowStatus(fixture.raw)
  const score = currentFixtureScore(fixture.raw)
  const hasScore = score.home !== undefined || score.away !== undefined

  return (
    <span className="ml-auto flex shrink-0 flex-col items-end gap-1 font-mono text-xs tabular-nums">
      {hasScore && (
        <span className="font-semibold">
          {score.home ?? '–'}–{score.away ?? '–'}
        </span>
      )}
      <span
        className={cn(
          'flex items-center gap-1.5 text-muted-foreground',
          status.kind === 'in-play' && 'text-success-emphasis'
        )}
      >
        {status.kind === 'in-play' && <FixtureLiveIndicator showLabel={false} />}
        {status.kind === 'kickoff' ? formatFixtureTime(fixture.startingAt) : status.label}
      </span>
    </span>
  )
}
