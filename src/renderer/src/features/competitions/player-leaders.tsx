import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { SportmonksTopscorer } from '@shared/contracts'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { PlayerPhoto } from '@/features/players/player-photo'
import { prefetchPlayerEntity } from '@/features/players/use-player'
import { TeamLogo } from '@/features/teams/team-logo'
import { prefetchTeamEntity } from '@/features/teams/use-team'
import { intentPrefetchProps } from '@/lib/prefetch'

const categories = [
  { id: 208, label: 'Goals' },
  { id: 209, label: 'Assists' },
  { id: 84, label: 'Yellow cards' },
  { id: 83, label: 'Red cards' }
]

export function PlayerLeaders({
  competitionId,
  date,
  seasonId,
  online,
  loaded,
  loading,
  topscorers
}: {
  competitionId: number
  date: string
  seasonId: number | null
  online: boolean
  loaded: boolean
  loading: boolean
  topscorers: SportmonksTopscorer[] | null
}): React.JSX.Element {
  const [typeId, setTypeId] = useState(208)
  const category = categories.find(({ id }) => id === typeId)!
  const rows = (topscorers ?? [])
    .filter((row) => row.type_id === typeId)
    .toSorted(
      (left, right) =>
        left.position - right.position ||
        (left.player?.display_name ?? '').localeCompare(right.player?.display_name ?? '') ||
        left.id - right.id
    )
  const pending = !loaded || (loading && topscorers === null)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-3 border-b">
        <CardTitle>Player leaders</CardTitle>
        <NativeSelect
          aria-label="Player leaderboard"
          className="w-36"
          value={typeId}
          onChange={(event) => setTypeId(Number(event.target.value))}
        >
          {categories.map(({ id, label }) => (
            <NativeSelectOption key={id} value={id}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </CardHeader>
      {pending ? (
        <div aria-label="Loading player leaders" role="status" className="flex flex-col gap-3 p-4">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          {topscorers === null && !online
            ? 'Player leaders not available offline'
            : 'No leaders for this season'}
        </p>
      ) : (
        <Table aria-label={`${category.label} leaders`}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 pl-4 text-center">
                <span className="sr-only">Rank</span>#
              </TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="pr-4 text-right">{category.label}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-sidebar-accent">
                <TableCell className="pl-4 text-center font-mono tabular-nums text-muted-foreground">
                  {row.position}
                </TableCell>
                <TableCell>
                  <Link
                    to="/players/$playerId"
                    params={{ playerId: String(row.player_id) }}
                    search={{
                      competition: competitionId,
                      date,
                      season: seasonId ?? undefined,
                      team: row.participant_id ?? undefined
                    }}
                    className="flex w-fit items-center gap-3 rounded-sm font-medium hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                    {...intentPrefetchProps(online, () => prefetchPlayerEntity(row.player_id))}
                  >
                    <PlayerPhoto
                      className="size-8 rounded-full"
                      imagePath={row.player?.image_path ?? null}
                      online={online}
                    />
                    {row.player?.display_name ?? `Player ${row.player_id}`}
                  </Link>
                </TableCell>
                <TableCell>
                  {row.participant_id === null ? (
                    <span className="text-muted-foreground">–</span>
                  ) : (
                    <Link
                      to="/teams/$teamId"
                      params={{ teamId: String(row.participant_id) }}
                      search={{ competition: competitionId, date, season: seasonId ?? undefined }}
                      className="flex w-fit items-center gap-2 rounded-sm text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                      {...intentPrefetchProps(online, () =>
                        prefetchTeamEntity(row.participant_id!)
                      )}
                    >
                      <TeamLogo
                        className="size-6"
                        imagePath={row.participant?.image_path ?? null}
                        online={online}
                      />
                      {row.participant?.name ?? `Team ${row.participant_id}`}
                    </Link>
                  )}
                </TableCell>
                <TableCell
                  className="pr-4 text-right font-mono font-semibold tabular-nums"
                  title={row.type?.name}
                >
                  {row.total}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
