import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Goal } from 'lucide-react'
import type { FixtureCommentaryQuery } from '@/data/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { PlayerPhoto } from '@/features/players/player-photo'
import { prefetchPlayerEntity } from '@/features/players/use-player'
import { intentPrefetchProps } from '@/lib/prefetch'
import { cn } from '@/lib/utils'
import { commentaryMinute, sortedCommentaries } from './commentary-data'
import type { FixtureDetailSearch } from './fixture-route'

export function FixtureCommentary({
  cached,
  loading,
  online,
  context
}: {
  cached: FixtureCommentaryQuery | null | undefined
  loading: boolean
  online: boolean
  context: FixtureDetailSearch
}): React.JSX.Element {
  const [keyOnly, setKeyOnly] = useState(false)
  const entries = sortedCommentaries(cached?.commentaries ?? [], keyOnly)
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
        <CardTitle>Commentary</CardTitle>
        <NativeSelect
          aria-label="Commentary filter"
          value={keyOnly ? 'key' : 'all'}
          onChange={(event) => setKeyOnly(event.target.value === 'key')}
        >
          <NativeSelectOption value="all">All updates</NativeSelectOption>
          <NativeSelectOption value="key">Key events</NativeSelectOption>
        </NativeSelect>
      </CardHeader>
      <CardContent className="px-0">
        {entries.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {cached === undefined || (loading && !cached)
              ? 'Loading commentary…'
              : !cached && !online
                ? 'Commentary not available offline'
                : keyOnly && cached?.commentaries.length
                  ? 'No key events'
                  : 'No commentary available'}
          </p>
        ) : (
          <ol className="divide-y" aria-label="Commentary, newest first">
            {entries.map((entry) => {
              const players = [
                ...new Map(
                  [entry.player, entry.relatedPlayer].flatMap((player) =>
                    player ? [[player.id, player] as const] : []
                  )
                ).values()
              ]
              return (
                <li
                  key={entry.id}
                  className={cn(
                    'grid grid-cols-[3.5rem_1fr] gap-3 px-4 py-4',
                    entry.is_goal && 'bg-success-muted/35'
                  )}
                >
                  <div className="flex flex-col items-center gap-2 font-mono text-sm tabular-nums text-muted-foreground">
                    <span>{commentaryMinute(entry)}</span>
                    {entry.is_goal && <Goal className="size-4 text-success" aria-label="Goal" />}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={cn('text-sm leading-relaxed', entry.is_important && 'font-medium')}
                    >
                      {entry.comment}
                    </p>
                    {players.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-3">
                        {players.map((player) => (
                          <Link
                            key={player.id}
                            to="/players/$playerId"
                            params={{ playerId: String(player.id) }}
                            search={{
                              competition: context.competition,
                              season: context.season,
                              team: context.team,
                              date: context.date
                            }}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                            {...intentPrefetchProps(online, () => prefetchPlayerEntity(player.id))}
                          >
                            <PlayerPhoto
                              className="size-6 rounded-full bg-muted"
                              imagePath={player.image_path ?? null}
                              online={online}
                            />
                            {player.display_name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
