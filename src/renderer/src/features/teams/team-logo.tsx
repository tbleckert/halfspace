import { Shield } from 'lucide-react'
import { ProviderImage } from '@/components/provider-image'
import { cn } from '@/lib/utils'

export function TeamLogo({
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
      fallback={<Shield className="size-3.5" />}
      imageClassName="size-full object-contain p-0.5"
      imagePath={imagePath}
      online={online}
    />
  )
}
