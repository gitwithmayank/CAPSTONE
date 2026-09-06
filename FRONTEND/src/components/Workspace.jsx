import { useState } from 'react'
import ChatPanel from './ChatPanel.jsx'
import PreviewPanel from './PreviewPanel.jsx'
import TerminalPanel from './TerminalPanel.jsx'
import { LogoMark, PlusIcon, SparklesIcon } from './Icons.jsx'
import { chatWithAI, starterSandbox } from '../lib/sandbox.js'

export default function Workspace({ sandboxId, live, previewUrl, onNewSandbox }) {
  const [html, setHtml] = useState(() => (live ? null : starterSandbox()))
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState('')
  const [frameKey, setFrameKey] = useState(0)

  async function runGeneration(prompt) {
    setGenerating(true)
    setStatus(live ? 'Contacting the AI builder…' : 'Thinking about your request…')
    try {
      const res = await chatWithAI(prompt, {
        projectId: live ? sandboxId : null,
        onStatus: setStatus,
      })
      if (res.live) {
        // Live sandbox: the agent edited files in the pod, so give the iframe
        // a nudge to re-read the Vite dev server (HMR may already handle it).
        setFrameKey((k) => k + 1)
      } else {
        setHtml(res.html)
      }
      return res
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-[#05060d] text-slate-200 lg:h-svh lg:overflow-hidden">
      {/* ---------- Top bar ---------- */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <LogoMark className="h-8 w-8" />
          <span className="hidden text-sm font-semibold text-white sm:block">
            Sandbox
          </span>
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-slate-400">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            <span className="truncate">{sandboxId}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 text-[11px] font-medium text-emerald-400 md:inline-flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Preview server online
          </span>
          <button
            type="button"
            onClick={onNewSandbox}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            New sandbox
          </button>
        </div>
      </header>

      {/* ---------- Panels ---------- */}
      <div className="flex flex-1 flex-col gap-3 p-3 lg:min-h-0 lg:flex-row">
        <div className="flex shrink-0 flex-col gap-3 lg:min-h-0 lg:w-[40%] lg:shrink-0">
          <div className="h-[40vh] min-h-0 lg:h-auto lg:flex-1">
            <ChatPanel onRun={runGeneration} thinking={generating} />
          </div>
          <div className="h-52 min-h-0 shrink-0 lg:h-56">
            <TerminalPanel sandboxId={sandboxId} onAi={runGeneration} />
          </div>
        </div>

        <div className="h-[62vh] min-h-0 flex-1 lg:h-auto">
          <PreviewPanel
            sandboxId={sandboxId}
            html={html}
            src={live ? previewUrl : null}
            frameKey={frameKey}
            generating={generating}
            status={status}
          />
        </div>
      </div>

      {/* ---------- Quick help strip ---------- */}
      <footer className="hidden shrink-0 items-center justify-center gap-2 border-t border-white/10 px-4 py-2 text-[11px] text-slate-500 lg:flex">
        <SparklesIcon className="h-3 w-3 text-violet-400" />
        Describe a frontend in the chat, or run{' '}
        <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-slate-300">
          ai &lt;prompt&gt;
        </code>{' '}
        in the terminal. The preview updates every time.
      </footer>
    </div>
  )
}