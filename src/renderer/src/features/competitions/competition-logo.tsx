import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CompetitionLogo({
  imagePath,
  className,
  online
}: {
  imagePath: string | null
  className?: string
  online: boolean
}): React.JSX.Element {
  const source = sportmonksImageUrl(imagePath)
  const [failure, setFailure] = useState<{ source: string; online: boolean } | null>(null)
  const failed = failure?.source === source && failure.online === online

  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-7 shrink-0 place-items-center overflow-hidden rounded-md bg-muted text-muted-foreground',
        className
      )}
    >
      {source && !failed ? (
        <img
          alt=""
          className="size-full object-contain p-1"
          src={source}
          onError={() => setFailure({ source, online })}
        />
      ) : (
        <Trophy className="size-3.5" />
      )}
    </span>
  )
}

function sportmonksImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null

  try {
    const url = new URL(imagePath)
    return url.protocol === 'https:' && url.hostname === 'cdn.sportmonks.com'
      ? url.toString()
      : null
  } catch {
    return null
  }
}
