import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { ErrorAlert } from '@/components/error-alert'
import { TeamLogo } from '@/features/teams/team-logo'
import { TeamPin } from '@/features/teams/team-pin'
import { usePinnedTeams } from '@/features/teams/use-team-pins'
import { useEntitySearch } from '@/features/search/use-entity-search'
import { SetupTvCountry } from './setup-tv-country'

export function SetupTeams({ online }: { online: boolean }): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [tvOpen, setTvOpen] = useState(false)
  const pins = usePinnedTeams()
  const search = useEntitySearch(query, true, online, 'teams')
  const teams = search.results.filter((result) => result.type === 'team')
  return (
    <>
      {!!pins?.length && (
        <div aria-label="Pinned teams" className="flex flex-wrap gap-2">
          {pins.map((pin) => (
            <div
              key={pin.teamId}
              className="flex max-w-full items-center gap-2 rounded-lg bg-secondary pl-2"
            >
              <TeamLogo imagePath={pin.imagePath} online={online} className="size-6 shrink-0" />
              <span className="min-w-0 truncate text-sm">{pin.name}</span>
              <TeamPin team={{ id: pin.teamId, name: pin.name, imagePath: pin.imagePath }} />
            </div>
          ))}
        </div>
      )}
      <Input
        aria-label="Search teams"
        placeholder="Search teams"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {search.error && <ErrorAlert>{search.error}</ErrorAlert>}
      {query.trim() && (
        <div className="max-h-64 overflow-y-auto" aria-label="Team search results">
          {teams.length > 0 && (
            <ul className="space-y-2">
              {teams.map((team) => (
                <li key={team.id} className="flex items-center gap-3 rounded-xl bg-card p-3">
                  <TeamLogo
                    imagePath={team.imagePath}
                    online={online}
                    className="size-8 shrink-0 bg-background"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{team.name}</span>
                    {team.subtitle && (
                      <span className="block text-xs text-muted-foreground">{team.subtitle}</span>
                    )}
                  </span>
                  <TeamPin team={team} />
                </li>
              ))}
            </ul>
          )}
          <p role="status" className="mt-2 text-xs text-muted-foreground">
            {search.searching
              ? 'Searching teams…'
              : teams.length
                ? ''
                : search.error
                  ? ''
                  : !online
                    ? 'No matching teams are saved. Search again when you’re online.'
                    : query.trim().length < 2
                      ? 'Enter at least two characters.'
                      : 'No teams found.'}
          </p>
        </div>
      )}
      {!online && !query.trim() && (
        <p role="status" className="text-xs text-muted-foreground">
          You’re offline. You can search saved teams or choose them later.
        </p>
      )}
      <details
        className="rounded-xl bg-card p-4"
        onToggle={(event) => setTvOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
          TV country <span className="font-normal text-muted-foreground">(optional)</span>
        </summary>
        {tvOpen && <SetupTvCountry online={online} />}
      </details>
    </>
  )
}
