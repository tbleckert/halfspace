import { useState } from 'react'
import { Landmark } from 'lucide-react'
import { sportmonksImageUrl } from '@/lib/sportmonks-image-url'
import { cn } from '@/lib/utils'

export function VenueImage({
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
    <div
      className={cn(
        'grid place-items-center overflow-hidden rounded-xl bg-muted text-muted-foreground',
        className
      )}
    >
      {source && !failed ? (
        <img
          alt=""
          className="size-full object-cover"
          src={source}
          onError={() => setFailure({ source, online })}
        />
      ) : (
        <Landmark className="size-10" strokeWidth={1.5} />
      )}
    </div>
  )
}
