// Small, dependency-free icon set used across the sandbox UI.
// Icons use currentColor so they inherit the surrounding text colour.

const svg = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function SendIcon({ className = '' }) {
  return (
    <svg className={className} {...svg}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}

export function SparklesIcon({ className = '' }) {
  return (
    <svg className={className} {...svg}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" />
      <path d="M5 16l.7 1.6L7 18l-1.3.7L5 20l-.7-1.3L3 18l1.3-.4L5 16Z" />
    </svg>
  )
}

export function TerminalIcon({ className = '' }) {
  return (
    <svg className={className} {...svg}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="m6.5 9 3 3-3 3" />
      <path d="M12 15h5" />
    </svg>
  )
}

export function MonitorIcon({ className = '' }) {
  return (
    <svg className={className} {...svg}>
      <rect x="2.5" y="3.5" width="19" height="13" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 16.5V21" />
    </svg>
  )
}

export function LayersIcon({ className = '' }) {
  return (
    <svg className={className} {...svg}>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </svg>
  )
}

export function ZapIcon({ className = '' }) {
  return (
    <svg className={className} {...svg}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  )
}

export function ShieldIcon({ className = '' }) {
  return (
    <svg className={className} {...svg}>
      <path d="M12 2 4 5v6c0 5 3.4 9.2 8 11 4.6-1.8 8-6 8-11V5l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function CopyIcon({ className = '' }) {
  return (
    <svg className={className} {...svg}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

export function CheckIcon({ className = '' }) {
  return (
    <svg className={className} {...svg}>
      <path d="m4 12.5 5 5L20 6.5" />
    </svg>
  )
}

export function RefreshIcon({ className = '' }) {
  return (
    <svg className={className} {...svg}>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 3v4h-4" />
    </svg>
  )
}

export function ExternalIcon({ className = '' }) {
  return (
    <svg className={className} {...svg}>
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M20 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h6" />
    </svg>
  )
}

export function PlusIcon({ className = '' }) {
  return (
    <svg className={className} {...svg}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

export function XIcon({ className = '' }) {
  return (
    <svg className={className} {...svg}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

export function MessageIcon({ className = '' }) {
  return (
    <svg className={className} {...svg}>
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z" />
      <path d="M8 9h8" />
      <path d="M8 12h5" />
    </svg>
  )
}

export function LogoMark({ className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-1/2 w-1/2 text-white" fill="currentColor" aria-hidden="true">
        <path d="M12 2 4 12l8 10 8-10-8-10Zm-2.6 10 2.6 3.1L14.6 12l-2.6-3.1L9.4 12Z" />
      </svg>
    </span>
  )
}

export function ArrowRightIcon({ className = '' }) {
  return (
    <svg className={className} {...svg}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  )
}