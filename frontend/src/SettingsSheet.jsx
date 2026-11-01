import { useState } from 'react'
import { CloseIcon } from './Icons'
import { beep, notificationState, notify, requestNotifications, unlockAudio } from './alerts'

function Segmented({ label, value, options, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col overflow-hidden rounded-md border border-line">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-11 border-l border-line px-2 text-base font-medium first:border-l-0 ${
            value === o.value ? 'bg-ink text-ground' : 'bg-panel text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex items-start gap-3 py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0"
      />
      <span>
        <span className="block text-base font-medium">{label}</span>
        {hint && <span className="block text-sm text-mute">{hint}</span>}
      </span>
    </label>
  )
}

export default function SettingsSheet({ settings, update, onClose }) {
  const [perm, setPerm] = useState(notificationState())

  const allow = async () => {
    unlockAudio()
    setPerm(await requestNotifications())
  }
  const test = () => {
    unlockAudio()
    if (settings.sound) beep()
    if (settings.vibrate && navigator.vibrate) navigator.vibrate([220, 110, 220])
    notify('RoadWatch', 'Test alert: police 300 m away', 'test')
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/50" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88dvh] w-full overflow-y-auto border-t border-line bg-panel px-4 pt-4 text-ink"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">Settings</h2>
          <button type="button" onClick={onClose} aria-label="Close settings" className="grid h-11 w-11 place-items-center">
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        <h3 className="mt-4 mb-2 font-display text-lg font-semibold">Alert distance</h3>
        <Segmented
          label="Alert distance"
          value={settings.radius}
          onChange={(radius) => update({ radius })}
          options={[
            { value: 200, label: '200 m' },
            { value: 500, label: '500 m' },
            { value: 1000, label: '1 km' },
          ]}
        />

        <h3 className="mt-6 mb-1 font-display text-lg font-semibold">How you get alerted</h3>
        <Toggle label="Sound" checked={settings.sound} onChange={(sound) => update({ sound })} />
        <Toggle label="Vibration" checked={settings.vibrate} onChange={(vibrate) => update({ vibrate })} />
        <Toggle
          label="Keep the screen on"
          hint="Browsers pause location when the screen is off, so alerts only work while RoadWatch is open."
          checked={settings.keepAwake}
          onChange={(keepAwake) => update({ keepAwake })}
        />
        <div className="flex items-center justify-between gap-3 py-2">
          <div>
            <p className="text-base font-medium">Notifications</p>
            <p className="text-sm text-mute">
              {perm === 'granted' && 'On. Shown when the app is in the background.'}
              {perm === 'default' && 'Off.'}
              {perm === 'denied' && 'Blocked. Allow them in your browser’s site settings.'}
              {perm === 'unsupported' && 'Not supported in this browser.'}
            </p>
          </div>
          {perm === 'default' && (
            <button type="button" onClick={allow} className="btn shrink-0">
              Allow
            </button>
          )}
        </div>
        <button type="button" onClick={test} className="btn mt-1 w-full">
          Send a test alert
        </button>

        <h3 className="mt-6 mb-2 font-display text-lg font-semibold">Theme</h3>
        <Segmented
          label="Theme"
          value={settings.theme}
          onChange={(theme) => update({ theme })}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />

        <h3 className="mt-6 mb-1 font-display text-lg font-semibold">Your privacy</h3>
        <p className="text-base text-mute">
          Your position stays on this phone. RoadWatch only sends a place when you tap a report button, and the
          server deletes it after 10 minutes. There are no accounts and no history.
        </p>
        <p className="mt-3 text-sm text-mute">Map data © OpenStreetMap contributors.</p>
      </section>
    </div>
  )
}
