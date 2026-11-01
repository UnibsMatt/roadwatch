export const TTL_MS = 10 * 60 * 1000

export const KINDS = {
  obstacle: { label: 'Obstacle', long: 'Obstacle on the road', color: '#e8651a', glyph: '#ffffff' },
  police: { label: 'Police', long: 'Police nearby', color: '#2f6fdb', glyph: '#ffffff' },
  accident: { label: 'Accident', long: 'Accident', color: '#d63b3b', glyph: '#ffffff' },
  hazard: { label: 'Hazard', long: 'Road hazard', color: '#f2b705', glyph: '#1a1e22' },
}

export function haversine(a, b) {
  const R = 6371000
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function formatDistance(m) {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`
}

export function formatLeft(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// The server only ever hears about a coarse 3x3 grid of ~11 km cells,
// never your exact position.
export function cellKey(lat, lng) {
  return `${Math.floor(lat * 10)},${Math.floor(lng * 10)}`
}

export function cellBox(key) {
  const [i, j] = key.split(',').map(Number)
  return {
    south: Math.max(-90, (i - 1) / 10),
    north: Math.min(90, (i + 2) / 10),
    west: Math.max(-180, (j - 1) / 10),
    east: Math.min(180, (j + 2) / 10),
  }
}
