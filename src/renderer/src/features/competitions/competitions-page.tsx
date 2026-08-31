import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { RefreshCw, Search, Star, Trophy } from 'lucide-react'
import { ErrorAlert } from '@/components/error-alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useOnline } from '@/lib/use-online'
import { intentPrefetchProps } from '@/lib/prefetch'
import { CompetitionLogo } from './competition-logo'
import { prefetchCompetitionWorkspace } from './use-competition-workspace'
import { toggleCompetitionPin, useCompetitions, usePinnedCompetitionIds } from './use-competitions'

const noPinnedCompetitionIds: number[] = []

export function CompetitionsPage(): React.JSX.Element {
  const { cached, refreshing, error, refresh } = useCompetitions()
  const pinnedCompetitionIds = usePinnedCompetitionIds() ?? noPinnedCompetitionIds
  const online = useOnline()
  const [query, setQuery] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const pinned = useMemo(() => new Set(pinnedCompetitionIds), [pinnedCompetitionIds])
  const competitions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()

    return (cached?.competitions ?? [])
      .filter(({ active }) => active)
      .filter((competition) => {
        if (!normalizedQuery) return true

        return [competition.name, competition.raw.short_code, competition.raw.country?.name].some(
          (value) => value?.toLocaleLowerCase().includes(normalizedQuery)
        )
      })
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [cached?.competitions, query])
  const visibleError = pinError ?? error

  async function togglePin(competitionId: number): Promise<void> {
    setPinError(null)

    try {
      await toggleCompetitionPin(competitionId, pinnedCompetitionIds)
    } catch {
      setPinError('Could not update this pin.')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-7 lg:p-10">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Competitions</h1>
        <Button
          aria-label="Refresh competitions"
          disabled={refreshing}
          size="icon"
          variant="outline"
          onClick={() => void refresh()}
        >
          <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
        </Button>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search competitions"
          className="bg-card pl-9"
          placeholder="Search competitions"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {visibleError && <ErrorAlert>{visibleError}</ErrorAlert>}

      {cached === undefined || (!cached.catalog && !visibleError) ? (
        <CompetitionListSkeleton />
      ) : !cached.catalog ? null : competitions.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center text-center">
            <Trophy className="mb-3 size-7 text-muted-foreground" />
            <p className="font-medium">{query ? 'No competitions found' : 'No competitions'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <div className="divide-y">
            {competitions.map((competition) => {
              const isPinned = pinned.has(competition.id)

              return (
                <div key={competition.id} className="flex items-center pr-2">
                  <Link
                    to="/competitions/$competitionId"
                    params={{ competitionId: String(competition.id) }}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 outline-none transition-colors hover:bg-muted/45 focus-visible:bg-muted/45"
                    {...intentPrefetchProps(online, () =>
                      prefetchCompetitionWorkspace(competition.id)
                    )}
                  >
                    <CompetitionLogo
                      imagePath={competition.imagePath}
                      className="size-9 rounded-lg bg-background"
                      online={online}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{competition.name}</span>
                      {competition.raw.country?.name && (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {competition.raw.country.name}
                        </span>
                      )}
                    </span>
                  </Link>

                  <Button
                    aria-label={`${isPinned ? 'Unpin' : 'Pin'} ${competition.name}`}
                    size="icon"
                    variant="ghost"
                    onClick={() => void togglePin(competition.id)}
                  >
                    <Star className={cn('size-4', isPinned && 'fill-amber-400 text-amber-500')} />
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function CompetitionListSkeleton(): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="flex items-center gap-3 border-b px-4 py-3.5 last:border-b-0">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}
