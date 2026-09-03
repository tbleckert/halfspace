import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { TeamLogo } from '@/features/teams/team-logo'
import { PlayerPhoto } from '@/features/players/player-photo'
import { useTeamEntity } from '@/features/teams/use-team'
import { usePlayerEntity } from '@/features/players/use-player'
import { useEntitySearch } from '@/features/search/use-entity-search'
import type { ComparisonKind } from './comparison-data'

export function ComparisonPicker({
  kind,
  id,
  excludedId,
  side,
  online,
  competitionId,
  seasonId,
  clubId,
  onSelect
}: {
  kind: ComparisonKind
  id?: number
  excludedId?: number
  side: 'First' | 'Second'
  online: boolean
  competitionId?: number
  seasonId?: number
  clubId?: number
  onSelect: (id: number) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const team = useTeamEntity(kind === 'teams' ? (id ?? null) : null, online)
  const player = usePlayerEntity(kind === 'players' ? (id ?? null) : null, online)
  const identity = kind === 'teams' ? team.cached?.team : player.cached?.player
  const name = kind === 'teams' ? team.cached?.team?.name : player.cached?.player?.displayName
  const noun = kind === 'teams' ? 'team' : 'player'
  const label = `${side} ${noun}`
  const search = useEntitySearch(query, open, online, kind)
  const results = search.results.filter(
    (result) => result.type === (kind === 'teams' ? 'team' : 'player')
  )
  const Photo = kind === 'teams' ? TeamLogo : PlayerPhoto
  const displayName =
    name ?? (id ? `${noun === 'team' ? 'Team' : 'Player'} ${id}` : `Choose ${noun}`)

  return (
    <Card className="flex min-w-0 flex-col gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <Photo
          className="size-14 shrink-0 rounded-full"
          imagePath={identity?.imagePath ?? null}
          online={online}
        />
        <div className="min-w-0">
          {id ? (
            kind === 'teams' ? (
              <Link
                className="font-semibold hover:text-primary"
                to="/teams/$teamId"
                params={{ teamId: String(id) }}
                search={{ competition: competitionId, season: seasonId }}
              >
                {displayName}
              </Link>
            ) : (
              <Link
                className="font-semibold hover:text-primary"
                to="/players/$playerId"
                params={{ playerId: String(id) }}
                search={{
                  competition: competitionId,
                  season: seasonId,
                  date: undefined,
                  team: clubId
                }}
              >
                {displayName}
              </Link>
            )
          ) : (
            <span className="font-medium text-muted-foreground">{displayName}</span>
          )}
        </div>
      </div>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setQuery('')
        }}
      >
        <DialogTrigger
          render={
            <Button
              variant="outline"
              className="self-start"
              aria-label={`Choose ${label.toLowerCase()}`}
            />
          }
        >
          <Search className="size-3.5" />
          {id ? 'Change' : `Choose ${noun}`}
        </DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle className="sr-only">Choose {label.toLowerCase()}</DialogTitle>
          <Command shouldFilter={false}>
            <div className="flex items-center gap-3 px-4">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <CommandInput
                aria-label={`Search ${kind}`}
                placeholder={`Search ${kind}`}
                value={query}
                onValueChange={setQuery}
                maxLength={80}
              />
            </div>
            {query.trim() && (
              <CommandList className="border-t">
                {results.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={String(result.id)}
                    disabled={result.id === excludedId}
                    onSelect={() => {
                      onSelect(result.id)
                      setOpen(false)
                      setQuery('')
                    }}
                  >
                    <Photo
                      className="size-9 rounded-full"
                      imagePath={result.imagePath}
                      online={online}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{result.name}</p>
                      {result.subtitle && (
                        <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
                      )}
                    </div>
                  </CommandItem>
                ))}
                {search.error && (
                  <p role="alert" className="px-3 py-2 text-sm text-destructive">
                    {search.error}
                  </p>
                )}
                {!results.length && (
                  <p role="status" className="p-4 text-sm text-muted-foreground">
                    {search.searching ? 'Searching…' : 'No matches'}
                  </p>
                )}
              </CommandList>
            )}
          </Command>
        </DialogContent>
      </Dialog>
      {(team.error || player.error) && (
        <p role="alert" className="text-sm text-destructive">
          {team.error ?? player.error}
        </p>
      )}
    </Card>
  )
}
