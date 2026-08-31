import { Trophy } from 'lucide-react'
import { ProviderImage } from '@/components/provider-image'
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
  return (
    <ProviderImage
      className={cn('size-7 shrink-0 rounded-md', className)}
      fallback={<Trophy className="size-3.5" />}
      imageClassName="size-full object-contain p-1"
      imagePath={imagePath}
      online={online}
    />
  )
}
