import { ExternalLink } from 'lucide-react'
import type { SportmonksSocial } from '@shared/contracts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { teamSocialUrl } from './team-socials-data'

export function TeamSocials({
  socials
}: {
  socials: SportmonksSocial[] | undefined
}): React.JSX.Element | null {
  const reported = socials?.filter(({ value }) => Boolean(value?.trim())) ?? []
  if (!reported.length) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Social channels</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm">
          {reported.map((social) => {
            const url = teamSocialUrl(social)
            const label = social.channel?.name ?? 'Social channel'
            return (
              <li key={social.id}>
                <p className="mb-1 text-xs text-muted-foreground">{label}</p>
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-2 rounded-sm font-medium hover:text-primary focus-visible:outline-ring"
                  >
                    <span className="truncate">{social.value}</span>
                    <ExternalLink className="size-3.5 shrink-0" aria-label="Opens in browser" />
                  </a>
                ) : (
                  <span className="break-words font-medium">{social.value}</span>
                )}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
