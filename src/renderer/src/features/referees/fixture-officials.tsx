import { Link } from '@tanstack/react-router'
import type { SportmonksRefereeAssignment } from '@shared/contracts'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import type { FixtureDetailSearch } from '@/features/fixtures/fixture-route'
import { PlayerPhoto } from '@/features/players/player-photo'
import { intentPrefetchProps } from '@/lib/prefetch'
import { prefetchRefereeEntity } from './use-referee'

export function FixtureOfficials({
  assignments,
  context,
  fixtureId,
  online
}: {
  assignments: SportmonksRefereeAssignment[]
  context: FixtureDetailSearch
  fixtureId: number
  online: boolean
}): React.JSX.Element | null {
  if (!assignments.length) return null
  return (
    <Card>
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="text-sm">Officials</CardTitle>
      </CardHeader>
      <div className="divide-y">
        {assignments
          .toSorted((a, b) => a.type_id - b.type_id)
          .map((assignment) => (
            <Link
              key={assignment.id}
              to="/referees/$refereeId"
              params={{ refereeId: String(assignment.referee_id) }}
              search={{ ...context, fixture: fixtureId }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              {...intentPrefetchProps(online, () => prefetchRefereeEntity(assignment.referee_id))}
            >
              <PlayerPhoto
                className="size-10 rounded-full bg-background"
                imagePath={assignment.referee?.image_path ?? null}
                online={online}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {assignment.referee?.display_name ?? `Official ${assignment.referee_id}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {assignment.type?.name ?? 'Match official'}
                </p>
              </div>
            </Link>
          ))}
      </div>
    </Card>
  )
}
