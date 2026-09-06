import type { SportmonksSocial } from '@shared/contracts'

export function teamSocialUrl(social: SportmonksSocial): string | null {
  const value = social.value?.trim()
  if (!value) return null
  try {
    if (/^https:\/\//i.test(value)) {
      const url = new URL(value)
      return url.username || url.password ? null : url.href
    }
    if (!social.channel?.base_url || !/^@?[\w.-]+$/.test(value)) return null
    const base = new URL(social.channel.base_url)
    if (base.protocol !== 'https:' || base.username || base.password) return null
    base.pathname = `${base.pathname.replace(/\/$/, '')}/${value.replace(/^@/, '')}`
    base.search = ''
    base.hash = ''
    return base.href
  } catch {
    return null
  }
}
