import {
  ArrowRightIcon,
  LayersIcon,
  LogoMark,
  MessageIcon,
  MonitorIcon,
  ShieldIcon,
  SparklesIcon,
  TerminalIcon,
  ZapIcon,
} from './Icons.jsx'

export default function Landing({ onStart }) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-x-hidden bg-[#05060d] text-slate-300">
      <div className="sb-glow pointer-events-none fixed inset-x-0 top-0 z-0 h-[640px]" />

      {/* ---------- Top bar ---------- */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <a href="#start" className="flex items-center gap-2.5 font-semibold text-white">
          <LogoMark className="h-9 w-9" />
          <span className="text-lg tracking-tight">Sandbox</span>
        </a>
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-400 md:flex">
          <a href="#features" className="transition hover:text-white">
            Features
          </a>
          <a href="#workflow" className="transition hover:text-white">
            How it works
          </a>
          <a href="#links" className="transition hover:text-white">
            Community
          </a>
        </nav>
        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:shadow-violet-500/45"
        >
          <SparklesIcon className="h-4 w-4" />
          Start sandbox
        </button>
      </header>

      {/* ---------- Hero ---------- */}
      <main id="start" className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-5">
        <section className="pt-16 text-center sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-violet-300">
            <ZapIcon className="h-3.5 w-3.5" />
            AI-powered frontend sandbox
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Spin up a sandbox.
            <span className="block bg-gradient-to-r from-violet-400 via-fuchsia-400 to-sky-400 bg-clip-text text-transparent">
              Build with AI.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-400">
            Start a sandbox, chat with the AI to generate any frontend you can
            describe, and preview it live — with a terminal right at hand.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onStart}
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-base font-semibold text-white shadow-xl shadow-violet-500/30 transition hover:-translate-y-0.5 hover:shadow-violet-500/50"
            >
              Create your sandbox
              <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>
            <a
              href="#workflow"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-base font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Free · No sign-up · Runs entirely in your browser
          </p>
        </section>
        {/* ---------- Showcase mock ---------- */}
        <section className="relative mx-auto mt-16 max-w-4xl pb-12">
          <div className="rounded-2xl border border-white/10 bg-[#0b0d16] p-2 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              <span className="ml-2 flex-1 rounded-lg bg-white/5 px-3 py-1 text-center font-mono text-[11px] text-slate-500">
                sandbox.local/preview
              </span>
            </div>
            <div className="space-y-4 p-6">
              <div className="mx-auto w-max rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-violet-300">
                Generated live from a prompt
              </div>
              <div className="mx-auto h-6 w-4/5 rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-sky-400 opacity-90" />
              <div className="mx-auto h-2.5 w-3/5 rounded-full bg-white/10" />
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="space-y-2 rounded-xl border border-white/5 bg-white/[0.04] p-4"
                  >
                    <div className="h-4 w-4 rounded-md bg-violet-400/50" />
                    <div className="h-2.5 w-4/5 rounded-full bg-white/10" />
                    <div className="h-2 w-full rounded-full bg-white/5" />
                    <div className="h-2 w-2/3 rounded-full bg-white/5" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute -bottom-16 -left-2 hidden w-72 rotate-[-2deg] rounded-xl border border-white/10 bg-[#0a0c14] shadow-2xl shadow-black/60 sm:block">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
              <span className="font-mono text-[11px] text-slate-500">
                sandbox — zsh
              </span>
              <span className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-400/80" />
                <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
              </span>
            </div>
            <div className="space-y-1.5 p-4 font-mono text-[11px] leading-relaxed">
              <p>
                <span className="text-violet-400">➜</span>{' '}
                <span className="text-slate-500">sandbox</span>{' '}
                <span className="text-slate-600">~</span>
              </p>
              <p className="text-emerald-400">VITE v8.2.2 ready in 231 ms</p>
              <p className="text-slate-600">➜ preview: http://localhost:5173</p>
              <p>
                <span className="text-slate-600">~</span>{' '}
                <span className="text-slate-400">$</span>{' '}
                <span className="sb-caret inline-block h-3.5 w-2 translate-y-0.5 bg-violet-400 align-middle" />
              </p>
            </div>
          </div>
        </section>
        {/* ---------- Features ---------- */}
        <section id="features" className="mx-auto mt-20 max-w-6xl scroll-mt-24">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">
              Features
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything a sandbox should be
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-slate-400">
              Three focused surfaces — chat, preview and terminal — working
              together on every request.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-violet-400/40 hover:bg-white/[0.06]">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                <MessageIcon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">
                Chat with AI
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Describe any frontend — a landing page, dashboard, store, blog —
                and the AI writes it for you.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-violet-400/40 hover:bg-white/[0.06]">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-300">
                <MonitorIcon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">
                Live preview
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Every generation renders instantly in a real iframe — refresh,
                open it in a new tab or copy the HTML.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-violet-400/40 hover:bg-white/[0.06]">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
                <TerminalIcon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">
                A real terminal
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Browse the project, inspect files and kick off new builds — all
                from the command line.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-300">
              <ZapIcon className="h-4 w-4 shrink-0 text-violet-300" />
              Instant results — no build pipeline
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-300">
              <LayersIcon className="h-4 w-4 shrink-0 text-fuchsia-300" />
              Reusable output you can keep
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-300">
              <ShieldIcon className="h-4 w-4 shrink-0 text-sky-300" />
              Sandboxed previews — isolated and safe
            </div>
          </div>
        </section>
        {/* ---------- How it works ---------- */}
        <section id="workflow" className="mx-auto mt-20 max-w-6xl scroll-mt-24">
          <div className="grid gap-10 rounded-3xl border border-white/10 bg-white/[0.02] p-8 sm:p-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                How it works
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                From idea to preview in three steps
              </h2>
              <p className="mt-3 text-slate-400">
                No accounts, no config. Click the button and start building.
              </p>
              <button
                type="button"
                onClick={onStart}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:-translate-y-0.5 hover:shadow-violet-500/45"
              >
                <SparklesIcon className="h-4 w-4" />
                Start building now
              </button>
            </div>
            <ol className="space-y-4">
              <li className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
                  1
                </span>
                <div>
                  <h3 className="font-semibold text-white">Start a sandbox</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    One click sets up your workspace with a live preview and a
                    terminal.
                  </p>
                </div>
              </li>
              <li className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-sky-500 text-sm font-bold text-white">
                  2
                </span>
                <div>
                  <h3 className="font-semibold text-white">Chat with the AI</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Ask for any frontend. The AI generates a full, styled page
                    tuned to your prompt.
                  </p>
                </div>
              </li>
              <li className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 text-sm font-bold text-white">
                  3
                </span>
                <div>
                  <h3 className="font-semibold text-white">
                    Preview, tweak, repeat
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Refine the result in chat or from the terminal until it is
                    exactly right.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* ---------- Final CTA ---------- */}
        <section className="mx-auto mt-20 max-w-4xl text-center">
          <div className="relative overflow-hidden rounded-3xl border border-violet-400/25 bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-sky-500/10 px-8 py-14">
            <SparklesIcon className="mx-auto h-8 w-8 text-violet-300" />
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Your first sandbox is one click away
            </h2>
            <p className="mx-auto mt-3 max-w-md text-slate-300">
              Create a sandbox now and ask the AI for exactly the frontend you
              have in mind.
            </p>
            <button
              type="button"
              onClick={onStart}
              className="group mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-7 py-3 text-base font-semibold text-white shadow-xl shadow-violet-500/30 transition hover:-translate-y-0.5 hover:shadow-violet-500/50"
            >
              Create your sandbox
              <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer id="links" className="relative z-10 border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 sm:flex-row">
          <div className="flex items-center gap-2.5 text-sm text-slate-500">
            <LogoMark className="h-7 w-7" />
            <span>
              Built with <span className="text-slate-300">Vite</span>,{' '}
              <span className="text-slate-300">React</span> and{' '}
              <span className="text-slate-300">Tailwind CSS</span> — right here
              in your sandbox.
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <a
              href="https://vite.dev/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/10"
            >
              <svg className="h-4 w-4" role="presentation" aria-hidden="true">
                <use href="/icons.svg#documentation-icon" />
              </svg>
              Vite docs
            </a>
            <a
              href="https://react.dev/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/10"
            >
              React docs
            </a>
            <a
              href="https://github.com/vitejs/vite"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/10"
            >
              <svg className="sb-icon-invert h-4 w-4" role="presentation" aria-hidden="true">
                <use href="/icons.svg#github-icon" />
              </svg>
              GitHub
            </a>
            <a
              href="https://chat.vite.dev/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/10"
            >
              <svg className="sb-icon-invert h-4 w-4" role="presentation" aria-hidden="true">
                <use href="/icons.svg#discord-icon" />
              </svg>
              Discord
            </a>
            <a
              href="https://x.com/vite_js"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/10"
            >
              <svg className="sb-icon-invert h-4 w-4" role="presentation" aria-hidden="true">
                <use href="/icons.svg#x-icon" />
              </svg>
              X.com
            </a>
            <a
              href="https://bsky.app/profile/vite.dev"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/10"
            >
              <svg className="sb-icon-invert h-4 w-4" role="presentation" aria-hidden="true">
                <use href="/icons.svg#bluesky-icon" />
              </svg>
              Bluesky
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}