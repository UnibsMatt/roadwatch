async function parse(res) {
  if (!res.ok) {
    let msg = 'Something went wrong. Try again.'
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') msg = body.detail
    } catch {
      /* keep default */
    }
    throw new Error(msg)
  }
  return res.json()
}

const post = (url, body) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).then(parse)

export const fetchBox = (b, signal) => {
  const q = new URLSearchParams({
    south: b.south.toFixed(4),
    west: b.west.toFixed(4),
    north: b.north.toFixed(4),
    east: b.east.toFixed(4),
  })
  return fetch(`/api/reports?${q}`, { signal }).then(parse)
}

export const postReport = (kind, lat, lng) => post('/api/reports', { kind, lat, lng })
export const confirmReport = (id) => post(`/api/reports/${id}/confirm`)
export const goneReport = (id) => post(`/api/reports/${id}/gone`)
