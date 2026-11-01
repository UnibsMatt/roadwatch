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

export function beep() {
  if (!ctx) return
  const t = ctx.currentTime
  ;[740, 988].forEach((freq, i) => {
    const start = t + i * 0.22
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.2)
  })
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
