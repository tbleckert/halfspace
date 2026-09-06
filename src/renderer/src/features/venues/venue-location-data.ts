export function locationMapUrl(
  latitude: string | number | null | undefined,
  longitude: string | number | null | undefined
): string | null {
  if (
    latitude == null ||
    longitude == null ||
    String(latitude).trim() === '' ||
    String(longitude).trim() === ''
  )
    return null
  const lat = Number(latitude)
  const lon = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
    return null
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`
}
