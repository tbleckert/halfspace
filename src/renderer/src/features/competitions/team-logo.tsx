import { useState } from 'react'
import { Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sportmonksImageUrl } from './sportmonks-image-url'

export function TeamLogo({
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
          className="size-full object-contain p-0.5"
          src={source}
          onError={() => setFailure({ source, online })}
        />
      ) : (
        <Shield className="size-3.5" />
      )}
    </span>
  )
}
