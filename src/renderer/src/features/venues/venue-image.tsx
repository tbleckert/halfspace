import { Landmark } from 'lucide-react'
import { ProviderImage } from '@/components/provider-image'
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
  return (
    <ProviderImage
      as="div"
      className={cn('rounded-xl', className)}
      fallback={<Landmark className="size-10" strokeWidth={1.5} />}
      imageClassName="size-full object-cover"
      imagePath={imagePath}
      online={online}
    />
  )
}
