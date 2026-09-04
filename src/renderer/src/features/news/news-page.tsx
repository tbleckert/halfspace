import { useNavigate } from '@tanstack/react-router'
import type { NewsFeed } from '@shared/contracts'
import { readCompetitionCatalog } from '@/data/db'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useOnline } from '@/lib/use-online'
import { useCompetitionSeasons } from '@/features/competitions/use-competition-workspace'
import { competitionSeasonOptions } from '@/features/competitions/competition-workspace-data'
import { NewsFeedView } from './news-feed'

export function NewsPage({
  feed = 'pre-match',
  page = 1,
  competition,
  season
}: {
  feed?: NewsFeed
  page?: number
  competition?: number
  season?: number
}): React.JSX.Element {
  const online = useOnline()
  const navigate = useNavigate({ from: '/news' })
  const catalog = useScopedLiveQuery(() => readCompetitionCatalog(), [])
  const competitions = catalog?.competitions
  const selected = competitions?.find((item) => item.id === competition)
  const seasons = useCompetitionSeasons(competition ?? null, online && competition !== undefined)
  const options = competitionSeasonOptions(
    seasons.cached?.seasons ?? [],
    selected?.raw.currentseason ?? null
  )
  const seasonId = competition ? (season ?? selected?.currentSeasonId ?? undefined) : undefined
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-7 lg:p-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">News</h1>
        <div className="flex items-center gap-2">
          <NativeSelect
            aria-label="News competition"
            value={competition ?? ''}
            onChange={(event) =>
              void navigate({
                search: { feed, competition: Number(event.target.value) || undefined }
              })
            }
          >
            <NativeSelectOption value="">All competitions</NativeSelectOption>
            {competitions
              ?.toSorted((a, b) => a.name.localeCompare(b.name))
              .map((item) => (
                <NativeSelectOption key={item.id} value={item.id}>
                  {item.name}
                </NativeSelectOption>
              ))}
          </NativeSelect>
          {!!competition && (
            <NativeSelect
              aria-label="News season"
              value={seasonId ?? ''}
              onChange={(event) =>
                void navigate({ search: { feed, competition, season: Number(event.target.value) } })
              }
            >
              {options.map((item) => (
                <NativeSelectOption key={item.id} value={item.id}>
                  {item.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </div>
      </header>
      {competition && !seasonId ? (
        <p className="text-sm text-muted-foreground">No season available</p>
      ) : (
        <NewsFeedView
          feed={feed}
          page={page}
          seasonId={seasonId}
          online={online}
          onFeedChange={(feed) =>
            void navigate({ search: { feed, competition, season: seasonId } })
          }
          onPageChange={(page) =>
            void navigate({ search: { feed, competition, season: seasonId, page } })
          }
        />
      )}
    </div>
  )
}
