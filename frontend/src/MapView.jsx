import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { KINDS, TTL_MS } from './lib'
import { glyphMarkup } from './Icons'

// OpenStreetMap's public tile server is fine for a small group. For heavier use,
// point VITE_TILE_URL at your own tile server (see README).
const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export default function MapView({ reports, pos, selectedId, follow, target, onSelect, onUserMove, onMoveEnd }) {
  const box = useRef(null)
  const map = useRef(null)
  const pins = useRef(new Map())
  const me = useRef(null)
  const firstFix = useRef(true)
  const cb = useRef({})
  cb.current = { onSelect, onUserMove, onMoveEnd }

  // create the map once
  useEffect(() => {
    const m = new maplibregl.Map({
      container: box.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: [TILE_URL],
            tileSize: 256,
            maxzoom: 19,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [10, 48],
      zoom: 3.5,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    })
    m.touchZoomRotate.disableRotation()
    m.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')
    m.on('dragstart', (e) => e.originalEvent && cb.current.onUserMove())
    m.on('click', (e) => {
      if (e.originalEvent?.target?.closest?.('.pin')) return
      cb.current.onSelect(null)
    })
    m.on('moveend', () => {
      const c = m.getCenter()
      cb.current.onMoveEnd({ lat: c.lat, lng: c.lng })
    })
    map.current = m
    const c = m.getCenter()
    cb.current.onMoveEnd({ lat: c.lat, lng: c.lng })
    return () => {
      m.remove()
      map.current = null
      pins.current.clear()
      me.current = null
    }
  }, [])

  // report pins
  useEffect(() => {
    const m = map.current
    if (!m) return
    const present = new Set()
    for (const r of reports) {
      present.add(r.id)
      let p = pins.current.get(r.id)
      if (!p) {
        const el = document.createElement('button')
        el.type = 'button'
        el.className = 'pin'
        el.innerHTML = `<span class="pin-disc">${glyphMarkup(r.kind)}</span>`
        el.setAttribute('aria-label', KINDS[r.kind].long)
        el.addEventListener('click', (ev) => {
          ev.stopPropagation()
          cb.current.onSelect(r.id)
        })
        const marker = new maplibregl.Marker({ element: el }).setLngLat([r.lng, r.lat]).addTo(m)
        p = { el, marker }
        pins.current.set(r.id, p)
      }
      const left = Math.max(0, Math.min(1, (r.expiresAt - Date.now()) / TTL_MS))
      p.el.style.setProperty('--c', KINDS[r.kind].color)
      p.el.style.setProperty('--g', KINDS[r.kind].glyph)
      p.el.style.setProperty('--p', `${(left * 100).toFixed(0)}%`)
      p.el.classList.toggle('is-selected', r.id === selectedId)
    }
    for (const [id, p] of pins.current) {
      if (!present.has(id)) {
        p.marker.remove()
        pins.current.delete(id)
      }
    }
  }, [reports, selectedId])

  // my position
  useEffect(() => {
    const m = map.current
    if (!m) return
    if (!pos) {
      me.current?.remove()
      me.current = null
      return
    }
    if (!me.current) {
      const el = document.createElement('div')
      el.className = 'me-dot'
      me.current = new maplibregl.Marker({ element: el }).setLngLat([pos.lng, pos.lat]).addTo(m)
    } else {
      me.current.setLngLat([pos.lng, pos.lat])
    }
    if (firstFix.current) {
      firstFix.current = false
      m.jumpTo({ center: [pos.lng, pos.lat], zoom: 15 })
    } else if (follow) {
      m.easeTo({ center: [pos.lng, pos.lat], duration: 500 })
    }
  }, [pos, follow])

  // fly to a requested spot
  useEffect(() => {
    if (target && map.current) {
      map.current.easeTo({
        center: [target.lng, target.lat],
        zoom: Math.max(map.current.getZoom(), 15),
        duration: 600,
      })
    }
  }, [target])

  return <div ref={box} className="map-wrap absolute inset-0" />
}
