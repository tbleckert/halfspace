import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import type { RefreshTransferFeedInput } from '@shared/contracts'
import { EntitySubpageNavigation } from '@/components/entity-subpage-navigation'
import { entitySubpageNavigationItemClassName } from '@/components/entity-subpage-navigation-variants'
import { ErrorAlert } from '@/components/error-alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
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
import { addDaysToIsoDate, currentTimeZone } from '@/lib/date'
import { useTodayInTimeZone } from '@/lib/use-today'
import { useOnline } from '@/lib/use-online'
import { intentPrefetchProps } from '@/lib/prefetch'
import { cn } from '@/lib/utils'
import { filterTransferPage, transferRangeError } from './transfer-feed-data'
import { formatTransferDate, transferLabel } from './transfer-display'
import { TransferTeam } from './transfer-team'
import { useTransferFeed } from './use-transfer-feed'

export function TransfersPage({
  start,
  end,
  page = 1,
  filter = '',
  status = 'all'
}: {
  start?: string
  end?: string
  page?: number
  filter?: string
  status?: 'all' | 'completed' | 'pending'
}): React.JSX.Element {
  const navigate = useNavigate({ from: '/transfers' })
  const online = useOnline()
  const today = useTodayInTimeZone(currentTimeZone())
  const input = useMemo<RefreshTransferFeedInput>(
    () =>
      start && end
        ? { feed: 'dates', page, startDate: start, endDate: end }
        : { feed: 'latest', page },
    [start, end, page]
  )
  const rangeError =
    input.feed === 'dates' ? transferRangeError(input.startDate, input.endDate) : null
  const feed = useTransferFeed(input, online && !rangeError)
  const transfers = filterTransferPage(feed.cached?.transfers ?? [], filter, status)
  const hasData = !!feed.cached?.query
  const loading = feed.cached === undefined || (!hasData && feed.refreshing)
  const setPage = (page: number): void => {
    void navigate({ search: (previous) => ({ ...previous, page }) })
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-7 lg:p-10">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Transfers</h1>
        <Button
          aria-label="Refresh transfers"
          variant="outline"
          size="icon"
          disabled={!online || feed.refreshing || !!rangeError}
          onClick={() => void feed.refresh()}
        >
          <RefreshCw className={cn('size-4', feed.refreshing && 'animate-spin')} />
        </Button>
      </header>
      <EntitySubpageNavigation aria-label="Transfer feed" className="border-b">
        <Link
          to="/transfers"
          search={{ filter, status }}
          className={entitySubpageNavigationItemClassName(input.feed === 'latest')}
          aria-current={input.feed === 'latest' ? 'page' : undefined}
        >
          Latest updates
        </Link>
        <Link
          to="/transfers"
          search={{
            start: start ?? addDaysToIsoDate(today, -6),
            end: end ?? today,
            filter,
            status
          }}
          className={entitySubpageNavigationItemClassName(input.feed === 'dates')}
          aria-current={input.feed === 'dates' ? 'page' : undefined}
        >
          By date
        </Link>
      </EntitySubpageNavigation>
      {input.feed === 'dates' && (
        <TransferDateRange
          key={`${start}:${end}`}
          start={input.startDate}
          end={input.endDate}
          onApply={(start, end) =>
            void navigate({ search: (previous) => ({ ...previous, start, end, page: 1 }) })
          }
        />
      )}
      {(rangeError || feed.error) && <ErrorAlert>{rangeError ?? feed.error}</ErrorAlert>}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Filter this page by player or club"
          placeholder="Filter this page by player or club"
          className="max-w-sm"
          value={filter}
          onChange={(event) =>
            void navigate({
              search: (previous) => ({ ...previous, filter: event.target.value || undefined }),
              replace: true,
              resetScroll: false
            })
          }
        />
        <NativeSelect
          aria-label="Transfer status"
          value={status}
          onChange={(event) =>
            void navigate({
              search: (previous) => ({
                ...previous,
                status: event.target.value as 'all' | 'completed' | 'pending'
              }),
              replace: true,
              resetScroll: false
            })
          }
        >
          <NativeSelectOption value="all">All statuses</NativeSelectOption>
          <NativeSelectOption value="completed">Completed</NativeSelectOption>
          <NativeSelectOption value="pending">Pending</NativeSelectOption>
        </NativeSelect>
      </div>
      <Card className="overflow-hidden">
        <Table aria-label="Transfers" className="min-w-[42rem] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Date</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead className="w-32">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.map((transfer) => (
              <TableRow key={transfer.id}>
                <TableCell className="py-3 font-mono text-xs text-muted-foreground">
                  <time dateTime={transfer.date}>{formatTransferDate(transfer.date)}</time>
                </TableCell>
                <TableCell>
                  <Link
                    to="/players/$playerId"
                    params={{ playerId: String(transfer.playerId) }}
                    search={{
                      date: transfer.date,
                      competition: undefined,
                      season: undefined,
                      team: undefined
                    }}
                    className="flex min-w-0 items-center gap-2.5 rounded-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    {...intentPrefetchProps(online, () => prefetchPlayerEntity(transfer.playerId))}
                  >
                    <PlayerPhoto
                      className="size-10 shrink-0 rounded-full"
                      imagePath={transfer.raw.player?.image_path ?? null}
                      online={online}
                    />
                    <span className="truncate text-sm font-medium">
                      {transfer.raw.player?.display_name ??
                        transfer.raw.player?.name ??
                        `Player ${transfer.playerId}`}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <TransferTeam
                    teamId={transfer.fromTeamId}
                    team={transfer.raw.fromTeam}
                    online={online}
                    date={transfer.date}
                  />
                </TableCell>
                <TableCell>
                  <TransferTeam
                    teamId={transfer.toTeamId}
                    team={transfer.raw.toTeam}
                    online={online}
                    date={transfer.date}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">{transferLabel(transfer)}</Badge>
                    {!transfer.raw.completed && <Badge variant="outline">Pending</Badge>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!transfers.length && (
              <TableRow>
                <TableCell colSpan={5} className="h-36 text-center text-sm text-muted-foreground">
                  {loading
                    ? 'Loading transfers…'
                    : !hasData && !online
                      ? 'This page is not available offline'
                      : filter || status !== 'all'
                        ? 'No matching transfers on this page'
                        : 'No transfers'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          <span className="font-mono tabular-nums">{transfers.length}</span> transfers on this page
        </span>
        <div className="flex items-center gap-2">
          <Button
            aria-label="Previous transfer page"
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span>
            Page <span className="font-mono tabular-nums">{page}</span>
          </span>
          <Button
            aria-label="Next transfer page"
            variant="outline"
            size="icon"
            disabled={!feed.cached?.query?.hasMore}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function TransferDateRange({
  start,
  end,
  onApply
}: {
  start: string
  end: string
  onApply: (start: string, end: string) => void
}): React.JSX.Element {
  const [startDate, setStartDate] = useState(start)
  const [endDate, setEndDate] = useState(end)
  const error = transferRangeError(startDate, endDate)
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (!error) onApply(startDate, endDate)
      }}
    >
      <Input
        aria-label="Transfer range start"
        type="date"
        value={startDate}
        onChange={(event) => setStartDate(event.target.value)}
        className="w-auto"
      />
      <span className="text-sm text-muted-foreground">to</span>
      <Input
        aria-label="Transfer range end"
        type="date"
        value={endDate}
        onChange={(event) => setEndDate(event.target.value)}
        className="w-auto"
      />
      <Button type="submit" variant="outline" disabled={!!error}>
        Apply
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
