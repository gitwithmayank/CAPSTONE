import { useEffect, useRef, useState } from 'react'
import { LogoMark, SendIcon, SparklesIcon } from './Icons.jsx'

const nextId = () => Math.random().toString(36).slice(2, 10)

const SUGGESTIONS = [
  'Build a startup landing page with purple accents',
  'Make a dark analytics dashboard',
  'Create a pricing page for a SaaS product',
  'Build a simple todo app',
]

function renderBold(text) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-white">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

export default function ChatPanel({ onRun, thinking }) {
  const [messages, setMessages] = useState(() => [
    {
      id: 'greeting',
      role: 'assistant',
      text: 'Hi! I build frontends from plain-English prompts. Try something like **“a landing page for a coffee brand”** or **“a dashboard for a fitness app”**, and I will generate it into the live preview for you.',
    },
  ])
  const [input, setInput] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  async function handleSend(text) {
    const trimmed = text.trim()
    if (!trimmed || thinking) return
    setInput('')
    setMessages((m) => [...m, { id: nextId(), role: 'user', text: trimmed }])
    try {
      const res = await onRun(trimmed)
      setMessages((m) => [
        ...m,
        {
          id: nextId(),
          role: 'assistant',
          text: res.message,
          meta: res.backend ? 'backend model' : 'local generator',
        },
      ])
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: nextId(),
          role: 'assistant',
          text: 'Hmm, something went wrong while generating. Please try again.',
        },
      ])
    }
  }

  const showSuggestions = messages.length === 1

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d16]">
      <header className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <SparklesIcon className="h-4 w-4 text-violet-400" />
          AI Copilot
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          online
        </span>
      </header>

      <div ref={listRef} className="sb-scroll flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((msg) =>
          msg.role === 'user' ? (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-violet-500/90 px-3.5 py-2.5 text-sm leading-relaxed text-white">
                {msg.text}
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center">
                <LogoMark className="h-7 w-7" />
              </span>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm leading-relaxed text-slate-300">
                {renderBold(msg.text)}
                {msg.meta && (
                  <span className="mt-2 block text-[11px] uppercase tracking-wider text-slate-500">
                    via {msg.meta}
                  </span>
                )}
              </div>
            </div>
          ),
        )}

        {thinking && (
          <div className="flex gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center">
              <LogoMark className="h-7 w-7" />
            </span>
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="sb-dot" />
              <span className="sb-dot" style={{ animationDelay: '150ms' }} />
              <span className="sb-dot" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {showSuggestions && !thinking && (
          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Try one of these
            </p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSend(s)}
                className="block w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-left text-sm text-slate-300 transition hover:border-violet-400/40 hover:bg-white/[0.06] hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* CHAT_INPUT */}
      <div className="border-t border-white/5 p-3">
        <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 transition focus-within:border-violet-400/50">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend(input)
              }
            }}
            rows={1}
            placeholder="Describe the frontend you want…"
            className="max-h-32 flex-1 resize-none bg-transparent py-1.5 text-sm text-white placeholder-slate-500 outline-none"
          />
          <button
            type="button"
            onClick={() => handleSend(input)}
            disabled={!input.trim() || thinking}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 transition enabled:hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            <SendIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-slate-600">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </section>
  )
}