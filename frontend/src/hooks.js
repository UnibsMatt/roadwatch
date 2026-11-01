import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchBox } from './api'
import { cellBox, cellKey, haversine } from './lib'

export const RADIUS_OPTIONS = [1000, 3000, 5000]
const DEFAULTS = { radius: 1000, sound: true, vibrate: true, keepAwake: false, theme: 'system' }
const POLL_MS = 8000

// Settings live only in this browser.
export function useSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('rw.settings') || '{}') }
      // Older versions offered 200 m and 500 m; move those to the closest current choice.
      if (!RADIUS_OPTIONS.includes(saved.radius)) {
        saved.radius = RADIUS_OPTIONS.reduce((a, b) => (Math.abs(b - saved.radius) < Math.abs(a - saved.radius) ? b : a))
      }
      return saved
    } catch {
      return DEFAULTS
    }
  })
  const update = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem('rw.settings', JSON.stringify(next))
      } catch {
        /* storage blocked */
      }
      return next
    })
  }, [])
  return [settings, update]
}

export function useTheme(theme) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? '#16191d' : '#e4e6e8')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

export function useNow(ms) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

// Position is read on the device and never sent to the server.
export function useGeolocation() {
  const [pos, setPos] = useState(null)
  const [status, setStatus] = useState('idle') // idle | asking | on | denied | unavailable
  const watch = useRef(null)

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) return setStatus('unavailable')
    if (watch.current !== null) return
    setStatus('asking')
    watch.current = navigator.geolocation.watchPosition(
      (p) => {
        setStatus('on')
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy })
      },
      (err) => {
        if (err.code === 1) {
          navigator.geolocation.clearWatch(watch.current)
          watch.current = null
          setStatus('denied')
        } else {
          setStatus((s) => (s === 'on' ? 'on' : 'unavailable'))
        }
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
    )
  }, [])

  useEffect(() => {
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((r) => r.state === 'granted' && start())
      .catch(() => {})
    return () => {
      if (watch.current !== null) navigator.geolocation.clearWatch(watch.current)
      watch.current = null
    }
  }, [start])

  return { pos, status, start }
}

// Fetches active reports for a coarse area around each given point.
export function useReports(points) {
  const [reports, setReports] = useState([])
  const [online, setOnline] = useState(true)

  const keys = [...new Set(points.filter(Boolean).map((p) => cellKey(p.lat, p.lng)))].sort().join('|')

  useEffect(() => {
    if (!keys) return
    const boxes = keys.split('|').map(cellBox)
    let stopped = false
    let ctrl = null

    const load = async () => {
      ctrl?.abort()
      ctrl = new AbortController()
      try {
        const lists = await Promise.all(boxes.map((b) => fetchBox(b, ctrl.signal)))
        if (stopped) return
        const t = Date.now()
        const byId = new Map()
        lists.flat().forEach((r) => byId.set(r.id, { ...r, expiresAt: t + r.seconds_left * 1000 }))
        setReports([...byId.values()])
        setOnline(true)
      } catch (e) {
        if (e.name !== 'AbortError' && !stopped) setOnline(false)
      }
    }

    load()
    const id = setInterval(load, POLL_MS)
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      ctrl?.abort()
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [keys])

  const upsert = useCallback((r) => {
    setReports((prev) => [
      ...prev.filter((x) => x.id !== r.id),
      { ...r, expiresAt: Date.now() + r.seconds_left * 1000 },
    ])
  }, [])
  const remove = useCallback((id) => setReports((prev) => prev.filter((x) => x.id !== id)), [])

  return { reports, online, upsert, remove }
}

// Compares your position with active reports on the device, once per report
// until you leave and come back.
export function useProximityAlerts({ pos, reports, radius, onAlert }) {
  const seen = useRef(new Set())
  const cb = useRef(onAlert)
  cb.current = onAlert

  useEffect(() => {
    if (!pos) return
    const ids = new Set(reports.map((r) => r.id))
    for (const id of seen.current) if (!ids.has(id)) seen.current.delete(id)
    for (const r of reports) {
      const d = haversine(pos, r)
      if (d <= radius) {
        if (!seen.current.has(r.id)) {
          seen.current.add(r.id)
          cb.current(r, d)
        }
      } else if (d > radius * 1.5) {
        seen.current.delete(r.id)
      }
    }
  }, [pos, reports, radius])

  return seen
}
