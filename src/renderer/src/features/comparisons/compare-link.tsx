import { Link } from '@tanstack/react-router'
import { ArrowLeftRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import type { ComparisonKind } from './comparison-data'

export function CompareLink({
  kind,
  id,
  competition,
  season,
  team
}: {
  kind: ComparisonKind
  id: number
  competition?: number
  season?: number
  team?: number
}): React.JSX.Element {
  return (
    <Link
      to="/compare"
      search={{ kind, left: id, competition, season, leftTeam: team }}
      className={buttonVariants({ variant: 'outline' })}
    >
      <ArrowLeftRight className="size-4" />
      Compare
    </Link>
  )
}
