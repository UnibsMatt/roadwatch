// 24x24 glyphs, drawn to be read at a glance from the driver's seat.
export const PATHS = {
  // traffic cone with a stripe cut out
  obstacle:
    'M11 3h2l4.2 14H6.8L11 3zM9.4 9.5l-.6 2h6.4l-.6-2H9.4zM4 19h16v2H4z',
  // light bar: dome, base and three rays
  police:
    'M7 17v-5a5 5 0 0 1 10 0v5H7zM5 19h14v2H5zM11.2 2h1.6v2.6h-1.6zM3.4 6.2l1.1-1.1 1.8 1.8-1.1 1.1zM20.6 6.2l-1.1-1.1-1.8 1.8 1.1 1.1z',
  // impact burst
  accident:
    'M12 2l2.3 6 6.2-2.2-3 5.8L22 14l-6 1.6.9 6.4-4.9-4.1L7.1 22l.9-6.4L2 14l4.5-2.4-3-5.8L9.7 8z',
  // warning triangle with an exclamation mark cut out
  hazard:
    'M12 3l10 18H2L12 3zM11 10v5h2v-5h-2zM11 16.5v2h2v-2h-2z',
}

export function glyphMarkup(kind) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${PATHS[kind]}"/></svg>`
}

export function KindIcon({ kind, className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="currentColor" fillRule="evenodd" d={PATHS[kind]} />
    </svg>
  )
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }

export function SlidersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
      <path d="M4 7h8M18 7h2M4 17h2M12 17h8" />
      <circle cx="15" cy="7" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
    </svg>
  )
}

export function LocateIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  )
}

export function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
