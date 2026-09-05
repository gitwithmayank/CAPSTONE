import { useState } from 'react'
import {
  CheckIcon,
  CopyIcon,
  ExternalIcon,
  MonitorIcon,
  RefreshIcon,
} from './Icons.jsx'

export default function PreviewPanel({ sandboxId, html, generating, status }) {
  const [frameKey, setFrameKey] = useState(0)
  const [copied, setCopied] = useState(false)

  function refresh() {
    setFrameKey((k) => k + 1)
  }

  function openExternal() {
    if (!html) return
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener')
  }

  async function copyHtml() {
    if (!html) return
    try {
      await navigator.clipboard.writeText(html)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard unavailable (e.g. non-secure context) — ignore.
    }
  }

  const busy = generating || !html

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d16]">
      <header className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
          <span className="truncate font-mono text-xs text-slate-400">
            sandbox://{sandboxId}/preview
          </span>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Reload preview"
          title="Reload preview"
        >
          <RefreshIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={copyHtml}
          disabled={!html}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
        >
          {copied ? (
            <CheckIcon className="h-3.5 w-3.5" />
          ) : (
            <CopyIcon className="h-3.5 w-3.5" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          type="button"
          onClick={openExternal}
          disabled={!html}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
        >
          <ExternalIcon className="h-3.5 w-3.5" />
          Open
        </button>
      </header>

      <div className="relative flex-1 bg-white">
        {html ? (
          <iframe
            key={frameKey}
            title="Live preview"
            srcDoc={html}
            sandbox="allow-scripts allow-same-origin"
            className="absolute inset-0 h-full w-full bg-white"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0b0d16] p-6 text-center">
            <MonitorIcon className="h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-500">
              Your generated page will render here.
            </p>
            <p className="max-w-xs text-xs text-slate-600">
              Ask the AI copilot for something — e.g. “a landing page for a
              coffee brand”.
            </p>
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0b0d16]/80 backdrop-blur-sm">
            <span className="h-9 w-9 animate-spin rounded-full border-2 border-violet-500/25 border-t-violet-400" />
            <p className="text-sm font-medium text-slate-300">
              {generating ? 'Generating…' : 'Waiting for the first prompt…'}
            </p>
            {status && <p className="max-w-xs text-center text-xs text-slate-500">{status}</p>}
          </div>
        )}
      </div>
    </section>
  )
}