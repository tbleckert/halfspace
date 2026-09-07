import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { db } from '@/data/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorAlert } from '@/components/error-alert'
import { useCompetitions } from '@/features/competitions/use-competitions'
import { useOnline } from '@/lib/use-online'
import { intentPrefetchProps } from '@/lib/prefetch'
import { TeamLogo } from './team-logo'
import { TeamPin } from './team-pin'
import { usePinnedTeams } from './use-team-pins'
import { useTeamDirectory } from './use-team-directory'
import { prefetchTeamEntity } from './use-team'
import { cn } from '@/lib/utils'

const selectClass =
  'h-8 max-w-56 rounded-md bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function TeamsPage(): React.JSX.Element {
  const online = useOnline()
  const [view, setView] = useState<'all' | 'pinned'>('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const pins = usePinnedTeams()
  const { cached: catalog } = useCompetitions(false)
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(search.trim())
      setPage(1)
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [search])
  const input = useMemo(
    () => ({
      page,
      query: query.length >= 2 ? query : undefined,
      countryId: filter.startsWith('country:') ? Number(filter.slice(8)) : undefined,
      seasonId: filter.startsWith('season:') ? Number(filter.slice(7)) : undefined
    }),
    [page, query, filter]
  )
  const directory = useTeamDirectory(input, online && view === 'all' && query.length !== 1)
  const localTeams = useScopedLiveQuery(() => db.teams.toArray(), [])
  const countries = useMemo(() => {
    const records = [
      ...(catalog?.competitions ?? []).map(({ raw }) => raw.country),
      ...(localTeams ?? []).map(({ raw }) => raw.country)
    ]
    return [
      ...new Map(
        records.filter((country) => country != null).map((country) => [country.id, country])
      ).values()
    ].sort((a, b) => a.name.localeCompare(b.name))
  }, [catalog, localTeams])
  const pinnedTeams = useMemo(
    () =>
      (pins ?? []).map((pin) => {
        const team = localTeams?.find(({ id }) => id === pin.teamId)
        return {
          id: pin.teamId,
          name: team?.name ?? pin.name,
          imagePath: team?.imagePath ?? pin.imagePath,
          country: team?.raw.country?.name
        }
      }),
    [pins, localTeams]
  )
  const cachedMatches = (localTeams ?? []).filter((team) =>
    team.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  )
  const displayed =
    view === 'pinned'
      ? pinnedTeams.filter((team) =>
          team.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
        )
      : (search.trim() &&
        (search.trim().length < 2 || search.trim() !== query || !directory.cached?.query)
          ? cachedMatches
          : (directory.cached?.teams ?? [])
        ).map((team) => ({ ...team, country: team.raw.country?.name }))

  function changeFilter(value: string): void {
    setFilter(value)
    setSearch('')
    setQuery('')
    setPage(1)
  }
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 lg:p-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Teams</h1>
        {view === 'all' && (
          <Button
            aria-label="Refresh teams"
            size="icon"
            variant="ghost"
            disabled={!online || directory.refreshing}
            onClick={() => void directory.refresh()}
          >
            <RefreshCw className={cn('size-4', directory.refreshing && 'animate-spin')} />
          </Button>
        )}
      </header>
      <div className="flex gap-5 border-b text-sm" role="group" aria-label="Team directory">
        {(['all', 'pinned'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            className={cn(
              'relative -mb-px cursor-pointer border-b-2 border-transparent pb-2 outline-none focus-visible:ring-2 focus-visible:ring-ring',
              view === value ? 'border-current font-semibold text-primary' : 'text-muted-foreground'
            )}
            onClick={() => {
              setView(value)
              changeFilter('')
            }}
          >
            {value === 'all' ? 'All teams' : 'Pinned'}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-2 size-4 text-muted-foreground" />
          <Input
            aria-label="Search teams"
            placeholder="Search teams"
            className="bg-card pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setFilter('')
            }}
          />
        </div>
        {view === 'all' && (
          <>
            <select
              aria-label="Filter teams by country"
              className={selectClass}
              value={filter.startsWith('country:') ? filter : ''}
              onChange={(event) => changeFilter(event.target.value)}
            >
              <option value="">All countries</option>
              {countries.map((country) => (
                <option key={country.id} value={`country:${country.id}`}>
                  {country.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter teams by competition"
              className={selectClass}
              value={filter.startsWith('season:') ? filter : ''}
              onChange={(event) => changeFilter(event.target.value)}
            >
              <option value="">All competitions</option>
              {catalog?.competitions
                .filter((competition) => competition.active && competition.currentSeasonId)
                .map((competition) => (
                  <option key={competition.id} value={`season:${competition.currentSeasonId}`}>
                    {competition.name}
                  </option>
                ))}
            </select>
          </>
        )}
      </div>
      {directory.error && view === 'all' && <ErrorAlert>{directory.error}</ErrorAlert>}
      {view === 'all' &&
      !directory.cached?.query &&
      !search &&
      (directory.refreshing || !directory.cached) ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((id) => (
            <Skeleton key={id} className="h-16 w-full" />
          ))}
        </div>
      ) : displayed.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {displayed.map((team) => (
            <div key={team.id} className="flex items-center rounded-xl bg-card pr-2">
              <Link
                to="/teams/$teamId"
                params={{ teamId: String(team.id) }}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-4 outline-none transition-colors hover:bg-sidebar-accent focus-visible:bg-sidebar-accent"
                {...intentPrefetchProps(online, () => prefetchTeamEntity(team.id))}
              >
                <TeamLogo
                  imagePath={team.imagePath}
                  online={online}
                  className="size-10 bg-background"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{team.name}</span>
                  {team.country && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {team.country}
                    </span>
                  )}
                </span>
              </Link>
              <TeamPin team={team} />
            </div>
          ))}
        </div>
      ) : directory.error && view === 'all' ? null : (
        <p className="py-8 text-sm text-muted-foreground">
          {view === 'pinned' && !search
            ? 'No pinned teams yet.'
            : query.length === 1
              ? 'Enter at least two characters.'
              : !online && !directory.cached?.query && view === 'all'
                ? 'Teams aren’t cached yet.'
                : directory.refreshing
                  ? 'Searching teams…'
                  : 'No teams found.'}
        </p>
      )}
      {view === 'all' && directory.cached?.query && search.trim() === query && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <Button variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page <span className="font-mono tabular-nums">{page}</span>
          </span>
          <Button
            variant="ghost"
            disabled={!directory.cached.query.hasMore}
            onClick={() => setPage(page + 1)}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
