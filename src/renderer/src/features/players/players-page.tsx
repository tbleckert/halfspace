import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react'
import { db } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useOnline } from '@/lib/use-online'
import { intentPrefetchProps } from '@/lib/prefetch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorAlert } from '@/components/error-alert'
import { cn } from '@/lib/utils'
import { PlayerPhoto } from './player-photo'
import { prefetchPlayerEntity } from './use-player'
import { usePlayerDirectory } from './use-player-directory'

export function PlayersPage(): React.JSX.Element {
  const online = useOnline()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [countryId, setCountryId] = useState<number>()
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(search.trim())
      setPage(1)
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [search])
  const input = useMemo(
    () => ({ page, countryId, query: query.length >= 2 ? query : undefined }),
    [page, countryId, query]
  )
  const directory = usePlayerDirectory(input, online && query.length !== 1)
  const localPlayers = useScopedLiveQuery(() => db.players.toArray(), [])
  const countries = useScopedLiveQuery(async () => {
    const [players, teams, competitions] = await Promise.all([
      db.players.toArray(),
      db.teams.toArray(),
      db.competitions.toArray()
    ])
    return [
      ...new Map(
        [...players, ...teams, ...competitions].flatMap(({ raw }) =>
          raw.country ? [[raw.country.id, raw.country] as const] : []
        )
      ).values()
    ].sort((a, b) => a.name.localeCompare(b.name))
  }, [])
  const pendingSearch =
    !!search.trim() &&
    (search.trim().length < 2 || search.trim() !== query || !directory.cached?.query)
  const players = pendingSearch
    ? (localPlayers ?? []).filter((player) =>
        [player.name, player.displayName].some((name) =>
          name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
        )
      )
    : (directory.cached?.players ?? [])
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 lg:p-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Players</h1>
        <Button
          aria-label="Refresh players"
          size="icon"
          variant="ghost"
          disabled={!online || directory.refreshing}
          onClick={() => void directory.refresh()}
        >
          <RefreshCw className={cn('size-4', directory.refreshing && 'animate-spin')} />
        </Button>
      </header>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-2 size-4 text-muted-foreground" />
          <Input
            aria-label="Search players"
            placeholder="Search players"
            className="bg-card pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setCountryId(undefined)
              setPage(1)
            }}
          />
        </div>
        <NativeSelect
          aria-label="Filter players by country"
          value={countryId ?? ''}
          onChange={(event) => {
            setCountryId(event.target.value ? Number(event.target.value) : undefined)
            setSearch('')
            setQuery('')
            setPage(1)
          }}
        >
          <NativeSelectOption value="">All countries</NativeSelectOption>
          {(countries ?? []).map((country) => (
            <NativeSelectOption key={country.id} value={country.id}>
              {country.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {directory.error && <ErrorAlert>{directory.error}</ErrorAlert>}
      {!search &&
      !directory.cached?.query &&
      (directory.refreshing || directory.cached === undefined) ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((id) => (
            <Skeleton key={id} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : players.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((player) => (
            <Link
              key={player.id}
              to="/players/$playerId"
              params={{ playerId: String(player.id) }}
              search={{
                competition: undefined,
                season: undefined,
                date: undefined,
                team: undefined
              }}
              className="flex items-start gap-3 rounded-xl bg-card p-4 outline-none transition-colors hover:bg-sidebar-accent focus-visible:bg-sidebar-accent"
              {...intentPrefetchProps(online, () => prefetchPlayerEntity(player.id))}
            >
              <PlayerPhoto
                imagePath={player.imagePath}
                online={online}
                className="size-14 bg-background"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">
                  {player.displayName || player.name}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {player.raw.detailedPosition?.name ??
                    player.raw.position?.name ??
                    'Position unknown'}
                </span>
                {player.raw.nationality && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {player.raw.nationality.name}
                  </span>
                )}
                {player.raw.country && player.raw.country.id !== player.raw.nationality?.id && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Country: {player.raw.country.name}
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        !directory.error && (
          <p className="py-8 text-sm text-muted-foreground">
            {query.length === 1
              ? 'Enter at least two characters.'
              : !online && !directory.cached?.query
                ? 'Players aren’t cached yet.'
                : directory.refreshing
                  ? 'Searching players…'
                  : 'No players found.'}
          </p>
        )
      )}
      {!pendingSearch && directory.cached?.query && (
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
