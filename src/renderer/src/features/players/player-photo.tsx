import { UserRound } from 'lucide-react'
import { ProviderImage } from '@/components/provider-image'
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
  return (
    <ProviderImage
      className={cn('shrink-0 rounded-lg', className)}
      fallback={<UserRound className="size-1/2" strokeWidth={1.5} />}
      imageClassName="size-full object-cover object-top"
      imagePath={imagePath}
      online={online}
    />
  )
}
