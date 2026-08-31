import { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { LoaderCircle, Search } from 'lucide-react'
import type { EntitySearchResult, EntitySearchResultType } from '@/data/db'
import { CompetitionLogo } from '@/features/competitions/competition-logo'
import { prefetchCompetitionWorkspace } from '@/features/competitions/use-competition-workspace'
import { PlayerPhoto } from '@/features/players/player-photo'
import { prefetchPlayerEntity } from '@/features/players/use-player'
import { TeamLogo } from '@/features/teams/team-logo'
import { prefetchTeamEntity } from '@/features/teams/use-team'
import { VenueImage } from '@/features/venues/venue-image'
import { prefetchVenueEntity } from '@/features/venues/use-venue'
import { intentPrefetchProps, startPrefetch } from '@/lib/prefetch'
import { cn } from '@/lib/utils'
import { useEntitySearch } from './use-entity-search'

const groupLabels: Record<EntitySearchResultType, string> = {
  competition: 'Competitions',
  team: 'Teams',
  player: 'Players',
  venue: 'Venues'
}

export function EntitySearchPalette({ online }: { online: boolean }): React.JSX.Element {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listboxId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
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

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
  }, [open])

  function close(): void {
    triggerRef.current?.focus()
    setOpen(false)
    setQuery('')
  }

  async function openResult(result: EntitySearchResult): Promise<void> {
    close()

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
        search: { competition: undefined, team: undefined }
      })
      return
    }

    await router.navigate({
      to: '/venues/$venueId',
      params: { venueId: String(result.id) },
      search: { competition: undefined, team: undefined }
    })
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (results.length === 0) return
      setActiveIndex((index) => {
        const nextIndex = Math.min(index + 1, results.length - 1)
        if (online) startPrefetch(() => prefetchSearchResult(results[nextIndex]))
        return nextIndex
      })
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => {
        const nextIndex = Math.max(index - 1, 0)
        if (online && results[nextIndex]) {
          startPrefetch(() => prefetchSearchResult(results[nextIndex]))
        }
        return nextIndex
      })
      return
    }

    if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault()
      void openResult(results[activeIndex])
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand-blue"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        <span>Search</span>
        <kbd
          aria-hidden="true"
          className="ml-auto rounded border bg-background px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground"
        >
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-4 pt-[12vh]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close()
          }}
        >
          <section
            aria-label="Search Halfspace"
            aria-modal="true"
            className="w-full max-w-xl overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl"
            role="dialog"
          >
            <div className={cn('flex items-center gap-3 px-4', hasQuery && 'border-b')}>
              <Search className="size-5 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                aria-activedescendant={
                  results[activeIndex] ? `${listboxId}-${activeIndex}` : undefined
                }
                aria-controls={hasQuery ? listboxId : undefined}
                aria-expanded={hasQuery}
                aria-label="Search competitions, teams, players, and venues"
                autoComplete="off"
                className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
                placeholder="Search competitions, teams, players, and venues"
                role="combobox"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={handleInputKeyDown}
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
              <div
                className="max-h-[min(32rem,62vh)] overflow-y-auto p-2"
                id={listboxId}
                role="listbox"
              >
                {results.map((result, index) => {
                  const previousType = results[index - 1]?.type

                  return (
                    <div key={`${result.type}-${result.id}`}>
                      {result.type !== previousType && (
                        <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {groupLabels[result.type]}
                        </p>
                      )}
                      <button
                        id={`${listboxId}-${index}`}
                        type="button"
                        aria-selected={activeIndex === index}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left outline-none',
                          activeIndex === index
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-muted'
                        )}
                        role="option"
                        onClick={() => void openResult(result)}
                        onMouseMove={() => setActiveIndex(index)}
                        {...intentPrefetchProps(online, () => prefetchSearchResult(result))}
                      >
                        <ResultImage online={online} result={result} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{result.name}</span>
                          {result.subtitle && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {result.subtitle}
                            </span>
                          )}
                        </span>
                      </button>
                    </div>
                  )
                })}

                {!searching && results.length === 0 && !error && (
                  <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                    No results for “{query.trim()}”.
                  </p>
                )}
                {error && <p className="px-3 py-3 text-center text-sm text-destructive">{error}</p>}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  )
}

async function prefetchSearchResult(result: EntitySearchResult): Promise<void> {
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

  if (result.type === 'competition') {
    return <CompetitionLogo className={className} imagePath={result.imagePath} online={online} />
  }

  if (result.type === 'team') {
    return <TeamLogo className={className} imagePath={result.imagePath} online={online} />
  }

  if (result.type === 'player') {
    return (
      <PlayerPhoto className="size-9 rounded-full" imagePath={result.imagePath} online={online} />
    )
  }

  return <VenueImage className="size-9 rounded-lg" imagePath={result.imagePath} online={online} />
}
