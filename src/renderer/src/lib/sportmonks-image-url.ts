export function sportmonksImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null

  try {
    const url = new URL(imagePath)
    return url.protocol === 'https:' && url.hostname === 'cdn.sportmonks.com'
      ? url.toString()
      : null
  } catch {
    return null
  }
}
