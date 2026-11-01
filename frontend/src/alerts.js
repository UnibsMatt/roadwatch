let ctx = null

// Browsers only allow sound after a tap, so call this from a button handler.
export function unlockAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
  } catch {
    /* no audio */
  }
}

// One sound per report kind, so you can tell them apart without looking.
// Each note is [frequency in Hz, start in s, length in s].
const SOUNDS = {
  // police: a short "nee-naw" siren, low/high twice
  police: { wave: 'triangle', notes: [[660, 0, 0.22], [880, 0.25, 0.22], [660, 0.5, 0.22], [880, 0.75, 0.22]] },
  // accident: three fast, sharp, high beeps
  accident: { wave: 'square', volume: 0.12, notes: [[1175, 0, 0.1], [1175, 0.15, 0.1], [1175, 0.3, 0.1]] },
  // obstacle: two falling tones
  obstacle: { wave: 'sine', notes: [[988, 0, 0.18], [659, 0.22, 0.28]] },
  // hazard: three rising tones
  hazard: { wave: 'sine', notes: [[523, 0, 0.14], [659, 0.17, 0.14], [784, 0.34, 0.22]] },
  // anything else: the original two-tone chime
  default: { wave: 'sine', notes: [[740, 0, 0.18], [988, 0.22, 0.18]] },
}

export function beep(kind) {
  if (!ctx) return
  const { wave, volume = 0.3, notes } = SOUNDS[kind] || SOUNDS.default
  const t = ctx.currentTime
  for (const [freq, at, len] of notes) {
    const start = t + at
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = wave
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + len)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + len + 0.02)
  }
}

export function notificationState() {
  return 'Notification' in window ? Notification.permission : 'unsupported'
}

export async function requestNotifications() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'default') {
    try {
      return await Notification.requestPermission()
    } catch {
      return Notification.permission
    }
  }
  return Notification.permission
}

export async function notify(title, body, tag) {
  if (notificationState() !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg) {
      await reg.showNotification(title, { body, tag, icon: '/icon.svg', vibrate: [220, 110, 220], renotify: true })
    } else {
      new Notification(title, { body, tag })
    }
  } catch {
    /* ignore */
  }
}
