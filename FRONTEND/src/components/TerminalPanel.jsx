import { useEffect, useRef, useState } from 'react'
import { TerminalIcon } from './Icons.jsx'

const FILES = [
  ['index.html', '2.1k', 'main document (generated)'],
  ['src/App.jsx', '3.4k', 'React root component'],
  ['src/preview.css', '6.8k', 'preview styles (generated)'],
  ['package.json', '0.7k', 'vite + react + tailwind'],
  ['vite.config.js', '0.4k', 'vite config with /app proxy'],
]

const HELP = [
  'Commands:',
  '  help                 show this help',
  '  ls                   list project files',
  '  cat <file>           print a file',
  '  ai <prompt>          generate a frontend from a prompt',
  '  npm run dev          start the dev server (demo)',
  '  npm run build        build the project (demo)',
  '  pwd · whoami · date  small utilities',
  '  echo <text>          print text',
  '  clear                clear the terminal',
]

let lineId = 1000
const mk = (kind, text) => ({ kind, text, id: (lineId += 1) })

const LINK = '→'

export default function TerminalPanel({ sandboxId, onAi }) {
  const [lines, setLines] = useState(() => [
    mk('info', `Welcome to sandbox ${sandboxId}. Ask the AI anything, e.g.:`),
    mk('info', '  ai build me a landing page for a yoga studio'),
    mk('muted', 'Type `help` to see all commands.'),
  ])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)
  const bodyRef = useRef(null)

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight })
  }, [lines])

  function append(objOrArr) {
    setLines((l) => [...l, ...(Array.isArray(objOrArr) ? objOrArr : [objOrArr])])
  }

  function runCommand(rawValue) {
    const value = rawValue.trim()
    setInput('')

    if (value) {
      setHistory((h) => [...h, value])
      setHistIdx(-1)
    }
    if (!value) return

    const [cmd, ...rest] = value.split(/\s+/)
    const arg = rest.join(' ').trim()
    const output = execute(cmd, arg)
    append([mk('cmd', `➜ ~ ${value}`), ...(output ?? [])])
  }
  {/* EXECUTE */}
  function execute(cmd, arg) {
    switch (cmd) {
      case 'help':
        return HELP.map((t) => mk('help', t))

      case 'pwd':
        return [mk('out', '/sandbox')]

      case 'whoami':
        return [mk('out', 'sandbox-user')]

      case 'date':
        return [mk('out', new Date().toLocaleString())]

      case 'ls':
        return [
          ...FILES.map(([name, size]) => mk('out', `${name.padEnd(20)}${size}`)),
          mk('muted', `\n${FILES.length} items in /sandbox`),
        ]

      case 'cat':
        return catFile(arg)

      case 'echo':
        return [mk('out', arg || '')]

      case 'npm':
        if (arg === 'run dev') {
          return [
            mk('ok', 'VITE v8.2.2  ready in 231 ms'),
            mk('muted', ''),
            mk('muted', `  ${LINK} Local:   http://localhost:5173/`),
            mk('muted', `  ${LINK} preview: http://localhost:5173/preview`),
          ]
        }
        if (arg === 'run build') {
          return [
            mk('info', 'vite v8.2.2 building for production...'),
            mk('ok', '\u2713 42 modules transformed.'),
            mk('muted', 'dist/index.html       0.45 kB \u2502 gzip: 0.30 kB'),
            mk('muted', 'dist/assets/index.css 3.21 kB \u2502 gzip: 0.80 kB'),
            mk('ok', '\u2713 built in 1.23s'),
          ]
        }
        return [mk('err', 'Unknown npm script. Try `npm run dev` or `npm run build`.')]

      case 'sandbox':
        return [
          mk('out', `id: ${sandboxId}`),
          mk('out', 'runtime: browser (sandboxed)'),
          mk('out', 'stack: vite \u00b7 react \u00b7 tailwindcss'),
        ]

      case 'ai': {
        if (!arg) return [mk('err', 'Usage: ai <describe the frontend>')]
        if (busy) return [mk('err', 'Generation already in progress.')]
        setBusy(true)
        append([
          mk('info', 'sandbox: queuing generation\u2026'),
          mk('info', 'sandbox: the AI is writing your frontend\u2026'),
        ])
        onAi(arg)
          .then((res) => {
            append([
              mk('ok', `\u2713 done — generated a ${res.kind ?? 'page'}${res.accent ? ` with #${res.accent.replace('#', '')} accents` : ''}, preview updated.`),
              mk('muted', 'run `cat preview.html` to inspect the output.'),
            ])
          })
          .catch(() => {
            append([mk('err', 'sandbox: generation failed — please try again.')])
          })
          .finally(() => setBusy(false))
        return []
      }

      default:
        return [mk('err', `command not found: ${cmd} — try \`help\``)]
    }
  }

  function catFile(file) {
    const map = {
      'index.html':
        '<!doctype html>\n<html lang="en">\n  <head>\n    <title>preview</title>\n  </head>\n  <body>\n    <!-- generated on every prompt -->\n  </body>\n</html>',
      'src/App.jsx':
        '// generated React entry\nfunction App() {\n  return <h1>Hello from the sandbox</h1>\n}\nexport default App',
      'src/preview.css':
        '/* generated preview styles */\n:root { --accent: #7c3aed }\nbody { background: #05060d }',
      'package.json':
        '{\n  "dependencies": {\n    "react": "^19.2.8",\n    "tailwindcss": "^4.3.3"\n  }\n}',
      'vite.config.js':
        "export default defineConfig({\n  plugins: [react(), tailwindcss()],\n  server: { proxy: { '/app': 'http://localhost' } },\n})",
    }
    if (!map[file]) return [mk('err', `cat: ${file}: no such file`)]
    return map[file].split('\n').map((t) => mk('out', t))
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0c14]">
      <header className="flex items-center justify-between border-b border-white/5 px-4 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <TerminalIcon className="h-4 w-4 text-slate-400" />
          sandbox — zsh
        </div>
        <div className="flex items-center gap-2">
          {busy && (
            <span className="flex items-center gap-1.5 text-[11px] text-violet-300">
              <span className="h-1.5 w-1.5 animate-spin rounded-full border border-violet-300" />
              generating
            </span>
          )}
          <button
            type="button"
            onClick={() => setLines([])}
            className="text-[11px] font-medium text-slate-500 transition hover:text-white"
          >
            clear
          </button>
        </div>
      </header>

      <div
        ref={bodyRef}
        onClick={() => inputRef.current?.focus()}
        className="sb-scroll flex-1 cursor-text overflow-y-auto p-3.5 font-mono text-xs leading-relaxed"
      >
        {lines.map((line) => (
          <p
            key={line.id}
            className={`whitespace-pre-wrap ${
              line.kind === 'cmd'
                ? 'text-slate-100'
                : line.kind === 'ok'
                  ? 'text-emerald-400'
                  : line.kind === 'err'
                    ? 'text-rose-400'
                    : line.kind === 'help'
                      ? 'text-slate-300'
                      : line.kind === 'muted'
                        ? 'text-slate-500'
                        : 'text-slate-400'
            }`}
          >
            {line.text}
          </p>
        ))}

        <p className="mt-1 flex items-center gap-1.5 text-slate-100">
          <span className="text-violet-400">➜</span>
          <span className="text-slate-500">~/sandbox</span>
          <span className="text-slate-600">$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runCommand(input)
              else if (e.key === 'ArrowUp') {
                e.preventDefault()
                const idx = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1)
                if (history[idx]) {
                  setHistIdx(idx)
                  setInput(history[idx])
                }
              } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                const idx = histIdx === -1 ? -1 : Math.min(history.length, histIdx + 1)
                setHistIdx(idx)
                setInput(idx >= 0 && history[idx] ? history[idx] : '')
              }
            }}
            className="min-w-[6ch] flex-1 bg-transparent text-slate-100 caret-violet-400 outline-none"
            aria-label="Terminal input"
            spellCheck="false"
            autoComplete="off"
          />
        </p>
      </div>
    </section>
  )
}