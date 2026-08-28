import { useState } from 'react'
import { UserRound } from 'lucide-react'
import { sportmonksImageUrl } from '@/lib/sportmonks-image-url'
import { cn } from '@/lib/utils'

export function PlayerPhoto({
  className,
  imagePath,
  online
}: {
  className?: string
  imagePath: string | null
  online: boolean
}): React.JSX.Element {
  const source = sportmonksImageUrl(imagePath)
  const [failure, setFailure] = useState<{ source: string; online: boolean } | null>(null)
  const failed = failure?.source === source && failure.online === online

  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground',
        className
      )}
    >
      {source && !failed ? (
        <img
          alt=""
          className="size-full object-cover object-top"
          src={source}
          onError={() => setFailure({ source, online })}
        />
      ) : (
        <UserRound className="size-1/2" strokeWidth={1.5} />
      )}
    </span>
  )
}
