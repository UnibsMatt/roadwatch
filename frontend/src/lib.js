// Must match TTL_MINUTES in backend/app/main.py.
export const TTL_MINUTES = 20
export const TTL_MS = TTL_MINUTES * 60 * 1000

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

// How far from your own position you can drop a report by tapping the map.
export const PICK_RADIUS_M = 1000

// A circle around `c` as a GeoJSON polygon, for drawing on the map.
export function circle(c, radius, steps = 96) {
  const R = 6371000
  const rad = Math.PI / 180
  const lat1 = c.lat * rad
  const lng1 = c.lng * rad
  const d = radius / R
  const ring = []
  for (let i = 0; i <= steps; i++) {
    const brg = (i / steps) * 2 * Math.PI
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brg))
    const lng2 =
      lng1 + Math.atan2(Math.sin(brg) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
    ring.push([lng2 / rad, lat2 / rad])
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }
}
