import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MapView from './MapView'
import SettingsSheet from './SettingsSheet'
import LegalSheet from './LegalSheet'
import { CloseIcon, InfoIcon, KindIcon, LocateIcon, SlidersIcon } from './Icons'
import { confirmReport, goneReport, postReport } from './api'
import { beep, notify, requestNotifications, unlockAudio } from './alerts'
import { useGeolocation, useNow, useProximityAlerts, useReports, useSettings, useTheme } from './hooks'
import { KINDS, PICK_RADIUS_M, TTL_MINUTES, formatDistance, formatLeft, haversine } from './lib'

const KIND_ORDER = ['obstacle', 'police', 'accident', 'hazard']

export default function App() {
  const [settings, update] = useSettings()
  useTheme(settings.theme)

  const { pos, status, start } = useGeolocation()
  const [center, setCenter] = useState(null)
  const { reports, online, upsert, remove } = useReports([pos, center])
  const now = useNow(5000)

  const [selectedId, setSelectedId] = useState(null)
  const [follow, setFollow] = useState(true)
  const [target, setTarget] = useState(null)
  const [spot, setSpot] = useState(null) // a place picked on the map to report at, instead of your position
  const [banner, setBanner] = useState(null)
  const [toast, setToast] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [legalTab, setLegalTab] = useState(null) // 'privacy' | 'cookies' | 'terms' while the info sheet is open
  const closeLegal = useCallback(() => setLegalTab(null), [])
  const lastPost = useRef(0)
  const toastTimer = useRef(null)

  const live = useMemo(() => reports.filter((r) => r.expiresAt > now), [reports, now])
  const selected = live.find((r) => r.id === selectedId) || null

  const showToast = useCallback((text) => {
    setToast(text)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }, [])

  // ---- proximity alerts (computed on the device) ----
  const onAlert = useCallback(
    (r, d) => {
      const text = `${KINDS[r.kind].long}, ${formatDistance(d)} away`
      setBanner({ id: r.id, kind: r.kind, text, lat: r.lat, lng: r.lng })
      if (settings.sound) beep(r.kind)
      if (settings.vibrate && navigator.vibrate) navigator.vibrate([220, 110, 220])
      if (document.hidden) notify('RoadWatch', text, r.id)
    },
    [settings.sound, settings.vibrate]
  )
  const seen = useProximityAlerts({ pos, reports: live, radius: settings.radius, onAlert })

  useEffect(() => {
    if (!banner) return
    const id = setTimeout(() => setBanner(null), 9000)
    return () => clearTimeout(id)
  }, [banner])

  // keep the screen on while driving, if asked
  useEffect(() => {
    if (!settings.keepAwake || !('wakeLock' in navigator)) return
    let lock = null
    const grab = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        /* not allowed right now */
      }
    }
    const onVisible = () => document.visibilityState === 'visible' && grab()
    grab()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release()
    }
  }, [settings.keepAwake])

  // ---- actions ----
  const enable = async () => {
    unlockAudio()
    start()
    try {
      await requestNotifications()
    } catch {
      /* optional */
    }
  }

  const locate = () => {
    setFollow(true)
    if (status !== 'on') return enable()
    if (pos) setTarget({ lat: pos.lat, lng: pos.lng })
  }

  // Tapping the map picks a spot to report at, within 10 km of you.
  const pickRadiusLabel = `${PICK_RADIUS_M / 1000} km`
  const onMapClick = (ll) => {
    if (selectedId) return setSelectedId(null)
    if (!pos) return showToast('Turn on location first. Then you can tap the map to choose where to report.')
    if (haversine(pos, ll) > PICK_RADIUS_M) return showToast(`Choose a spot within ${pickRadiusLabel} of you.`)
    setSpot(ll)
  }

  const report = async (kind) => {
    if (!pos) return showToast('Turn on location first, then send your report.')
    if (spot && haversine(pos, spot) > PICK_RADIUS_M) {
      setSpot(null)
      return showToast(`The chosen spot is now more than ${pickRadiusLabel} away. Choose it again.`)
    }
    if (Date.now() - lastPost.current < 8000) return showToast('Wait a moment before the next report.')
    lastPost.current = Date.now()
    const at = spot || pos
    try {
      const r = await postReport(kind, at.lat, at.lng)
      seen.current.add(r.id) // don't alert yourself about your own report
      upsert(r)
      setSpot(null)
      showToast(`${KINDS[kind].label} reported. It stays on the map for ${TTL_MINUTES} minutes.`)
    } catch (e) {
      showToast(e.message)
    }
  }

  const confirm = async () => {
    try {
      upsert(await confirmReport(selected.id))
      showToast(`Thanks. It stays on the map for another ${TTL_MINUTES} minutes.`)
    } catch (e) {
      showToast(e.message)
      remove(selected.id)
    }
  }

  const gone = async () => {
    const id = selected.id
    try {
      const res = await goneReport(id)
      if (res.removed) remove(id)
      showToast(res.removed ? 'Removed from the map.' : 'Noted. It leaves the map after a few votes.')
      setSelectedId(null)
    } catch (e) {
      showToast(e.message)
    }
  }

  // ---- header line ----
  const nearby = pos ? live.filter((r) => haversine(pos, r) <= settings.radius).length : 0
  const radiusLabel = settings.radius >= 1000 ? `${settings.radius / 1000} km` : `${settings.radius} m`
  let statusLine = 'Location is off'
  if (!online) statusLine = 'No connection. Retrying.'
  else if (status === 'on') statusLine = nearby ? `${nearby} within ${radiusLabel}` : `Clear within ${radiusLabel}`
  else if (status === 'asking') statusLine = 'Finding your position'

  return (
    <div
      className="flex h-dvh flex-col bg-ground text-ink"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-panel px-4">
        <h1 className="font-display text-xl font-bold tracking-tight">RoadWatch</h1>
        <p className="min-w-0 flex-1 truncate text-right text-base text-mute" aria-live="polite">
          {statusLine}
        </p>
        <button
          type="button"
          onClick={() => setLegalTab('privacy')}
          aria-label="Privacy, cookies and terms of use"
          className="-mr-3 grid h-11 w-11 place-items-center"
        >
          <InfoIcon className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          className="-mr-2 grid h-11 w-11 place-items-center"
        >
          <SlidersIcon className="h-6 w-6" />
        </button>
      </header>

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <MapView
          reports={live}
          pos={pos}
          spot={spot}
          selectedId={selectedId}
          follow={follow}
          target={target}
          onSelect={setSelectedId}
          onMapClick={onMapClick}
          onUserMove={() => setFollow(false)}
          onMoveEnd={setCenter}
        />

        {banner && (
          <button
            type="button"
            role="alert"
            onClick={() => {
              setSelectedId(banner.id)
              setTarget({ lat: banner.lat, lng: banner.lng })
              setFollow(false)
              setBanner(null)
            }}
            className="absolute top-3 right-16 left-3 z-20 flex items-center gap-3 rounded-md p-3 text-left"
            style={{ background: KINDS[banner.kind].color, color: KINDS[banner.kind].glyph }}
          >
            <KindIcon kind={banner.kind} className="h-8 w-8 shrink-0" />
            <span className="font-display text-xl leading-tight font-semibold">{banner.text}</span>
          </button>
        )}

        <button
          type="button"
          onClick={locate}
          aria-label="Centre on my position"
          className={`absolute top-3 right-3 z-10 grid h-11 w-11 place-items-center rounded-md border border-line bg-panel ${
            follow && status === 'on' ? 'text-ink' : 'text-mute'
          }`}
        >
          <LocateIcon className="h-6 w-6" />
        </button>

        <div className="absolute inset-x-3 bottom-3 z-10 flex flex-col gap-2">
          {toast && (
            <p role="status" className="rounded-md bg-ink px-3 py-2 text-base text-ground">
              {toast}
            </p>
          )}

          {status !== 'on' && !selected && (
            <section className="rounded-md border border-line bg-panel p-4">
              <h2 className="font-display text-xl font-semibold">
                {status === 'denied' ? 'Location is blocked' : 'Turn on your location'}
              </h2>
              <p className="mt-1 text-base text-mute">
                {status === 'denied' &&
                  'Allow location for this site in your browser settings, then reload the page.'}
                {status === 'unavailable' &&
                  'Your position can’t be read. Phones need a secure (https) address and a GPS signal.'}
                {(status === 'idle' || status === 'asking') &&
                  'It stays on your phone. RoadWatch uses it to warn you about nearby reports and to place yours.'}
              </p>
              <p className="mt-2 text-sm text-mute">
                Reports come from other drivers and may be wrong. Don’t handle your phone while driving. By using
                RoadWatch you accept the{' '}
                <button type="button" onClick={() => setLegalTab('terms')} className="underline">
                  terms of use
                </button>{' '}
                and the{' '}
                <button type="button" onClick={() => setLegalTab('privacy')} className="underline">
                  privacy notice
                </button>
                . No cookies.
              </p>
              {status !== 'denied' && (
                <button type="button" onClick={enable} className="btn btn-solid mt-3 w-full">
                  {status === 'asking' ? 'Waiting for your phone…' : 'Turn on location and alerts'}
                </button>
              )}
            </section>
          )}

          {spot && pos && !selected && (
            <section className="rounded-md border border-line bg-panel p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl leading-tight font-semibold">Report at the chosen spot</h2>
                  <p className="text-base text-mute">
                    {formatDistance(haversine(pos, spot))} from you. Pick what it is below, or tap the map to move it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSpot(null)}
                  aria-label="Use my position instead"
                  className="-mt-1 -mr-1 grid h-11 w-11 shrink-0 place-items-center"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
              <button type="button" onClick={() => setSpot(null)} className="btn mt-3 w-full">
                Use my position instead
              </button>
            </section>
          )}

          {selected && (
            <section className="flex overflow-hidden rounded-md border border-line bg-panel">
              <div className="w-1.5 shrink-0" style={{ background: KINDS[selected.kind].color }} />
              <div className="min-w-0 flex-1 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-xl leading-tight font-semibold">{KINDS[selected.kind].long}</h2>
                    <p className="text-base text-mute">
                      {pos ? `${formatDistance(haversine(pos, selected))} away. ` : ''}
                      Leaves the map in {formatLeft(selected.expiresAt - now)}.
                    </p>
                    {selected.confirmations > 0 && (
                      <p className="text-base text-mute">
                        Confirmed {selected.confirmations} {selected.confirmations === 1 ? 'time' : 'times'}.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    aria-label="Close"
                    className="-mt-1 -mr-1 grid h-11 w-11 shrink-0 place-items-center"
                  >
                    <CloseIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={confirm} className="btn btn-solid">
                    Still there
                  </button>
                  <button type="button" onClick={gone} className="btn">
                    It’s gone
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      <nav
        aria-label="Report something"
        className="grid shrink-0 grid-cols-4 border-t border-line bg-panel"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {KIND_ORDER.map((kind, i) => (
          <button
            key={kind}
            type="button"
            onClick={() => report(kind)}
            className={`flex flex-col items-center gap-1.5 px-1 pt-3 pb-3 active:bg-ground ${i ? 'border-l border-line' : ''}`}
          >
            <span
              className="grid h-12 w-12 place-items-center rounded-md"
              style={{ background: KINDS[kind].color, color: KINDS[kind].glyph }}
            >
              <KindIcon kind={kind} className="h-7 w-7" />
            </span>
            <span className="font-display text-base font-semibold">{KINDS[kind].label}</span>
          </button>
        ))}
      </nav>

      {settingsOpen && (
        <SettingsSheet
          settings={settings}
          update={update}
          onClose={() => setSettingsOpen(false)}
          onOpenLegal={setLegalTab}
        />
      )}

      {legalTab && <LegalSheet initialTab={legalTab} onClose={closeLegal} />}
    </div>
  )
}
