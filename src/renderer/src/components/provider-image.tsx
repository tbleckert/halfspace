import { useState } from 'react'
import { sportmonksImageUrl } from '@/lib/sportmonks-image-url'
import { cn } from '@/lib/utils'

export function ProviderImage({
  as: Component = 'span',
  className,
  fallback,
  imageClassName,
  imagePath,
  online
}: {
  as?: 'div' | 'span'
  className?: string
  fallback: React.ReactNode
  imageClassName: string
  imagePath: string | null
  online: boolean
}): React.JSX.Element {
  const source = sportmonksImageUrl(imagePath)
  const [failure, setFailure] = useState<{ source: string; online: boolean } | null>(null)
  const failed = failure?.source === source && failure.online === online

  return (
    <Component
      aria-hidden="true"
      className={cn(
        'grid place-items-center overflow-hidden bg-muted text-muted-foreground',
        className
      )}
    >
      {source && !failed ? (
        <img
          alt=""
          className={imageClassName}
          src={source}
          onError={() => setFailure({ source, online })}
        />
      ) : (
        fallback
      )}
    </Component>
  )
}
