import { ProviderImage } from '@/components/provider-image'

export function FixtureVenueBackground({
  imagePath,
  online
}: {
  imagePath: string | null
  online: boolean
}): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="fixture-venue-background pointer-events-none absolute inset-y-0 right-0 -z-10 w-3/5 opacity-45"
    >
      <ProviderImage
        as="div"
        className="h-full w-full bg-transparent"
        imageClassName="h-full w-full object-cover"
        imagePath={imagePath}
        online={online}
        fallback={<div className="fixture-venue-fallback h-full w-full" />}
      />
    </div>
  )
}
