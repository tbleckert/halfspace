import type { SportmonksCommentary } from '@shared/contracts'

export function sortedCommentaries(
  commentaries: SportmonksCommentary[],
  keyOnly: boolean
): SportmonksCommentary[] {
  return commentaries
    .filter((item) => !keyOnly || item.is_goal || item.is_important)
    .sort((a, b) => b.order - a.order || b.id - a.id)
}

export function commentaryMinute(
  item: Pick<SportmonksCommentary, 'minute' | 'extra_minute'>
): string {
  if (item.minute === null) return '—'
  return `${item.minute}${item.extra_minute ? `+${item.extra_minute}` : ''}′`
}
