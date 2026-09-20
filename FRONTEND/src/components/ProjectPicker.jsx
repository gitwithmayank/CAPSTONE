import { useState } from 'react'
import {
  ArrowRightIcon,
  LogoMark,
  PlusIcon,
  RefreshIcon,
  ShieldIcon,
  SparklesIcon,
} from './Icons.jsx'

const cardClass =
  'rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-violet-400/40 hover:bg-white/[0.06]'

// Step between the landing page and the launch screen: the sandbox APIs are
// protected and every sandbox is owned by a project, so the user either picks
// one of their existing projects (GET /api/sandbox/projects) or creates a new
// one (POST /api/sandbox/project) before we call POST /api/sandbox/start.
export default function ProjectPicker({
  projects = [],
  needsAuth = false,
  busy = false,
  error = '',
  onSignIn,
  onReload,
  onCreate,
  onStart,
  onBack,
}) {
  const [title, setTitle] = useState('')
  const [working, setWorking] = useState(false)

  const locked = busy || working

  async function handleCreate(event) {
    event.preventDefault()
    const clean = title.trim()
    if (locked || !clean) return
    setWorking(true)
    try {
      const created = await onCreate(clean)
      if (created) setTitle('')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col overflow-x-hidden bg-[#05060d] text-slate-300">
      <div className="sb-glow pointer-events-none fixed inset-x-0 top-0 z-0 h-[520px]" />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-5">
        <span className="flex items-center gap-2.5 font-semibold text-white">
          <LogoMark className="h-9 w-9" />
          <span className="text-lg tracking-tight">Sandbox</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReload}
            disabled={locked}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <RefreshIcon className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Back
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-5 pb-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-violet-300">
          <SparklesIcon className="h-3.5 w-3.5" />
          Step 1 of 2
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Choose a project
        </h1>
        <p className="mt-3 max-w-xl text-slate-400">
          Every sandbox boots inside a project. Pick one of yours and we will
          provision the pod, the service and the preview URL for it.
        </p>

        {needsAuth && (
          <div className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
            <div className="flex items-start gap-3">
              <ShieldIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div>
                <h2 className="text-sm font-semibold text-amber-100">
                  Sign in to continue
                </h2>
                <p className="mt-1 text-sm text-amber-200/80">
                  The sandbox API answered{' '}
                  <code className="font-mono">401</code> — these routes are
                  protected, so we need a session cookie first.
                </p>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
                >
                  Continue with Google
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-6 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          {/* ---------- Existing projects ---------- */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
              Your projects ({projects.length})
            </h2>

            <div className="mt-4 space-y-3">
              {projects.length === 0 && !needsAuth && (
                <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-8 text-center text-sm text-slate-500">
                  No projects yet — create your first one on the right.
                </p>
              )}

              {projects.map((project) => (
                <article
                  key={project.id}
                  className={`${cardClass} flex items-center justify-between gap-4`}
                >
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-white">
                      {project.title || 'Untitled Project'}
                    </h3>
                    <p className="mt-1 truncate font-mono text-[11px] text-slate-500">
                      {project.id}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onStart(project.id)}
                    disabled={locked}
                    className="group inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:shadow-violet-500/45 disabled:opacity-50"
                  >
                    {locked ? 'Starting…' : 'Start sandbox'}
                    <ArrowRightIcon className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </button>
                </article>
              ))}
            </div>
          </section>

          {/* ---------- New project ---------- */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
              New project
            </h2>
            <form onSubmit={handleCreate} className={`${cardClass} mt-4 space-y-3`}>
              <label
                htmlFor="project-title"
                className="block text-sm font-medium text-slate-300"
              >
                Project title <span className="text-rose-300">*</span>
              </label>
              <input
                id="project-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="My Sandbox"
                maxLength={80}
                className="w-full rounded-xl border border-white/10 bg-[#0b0d16] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/60"
              />
              <button
                type="submit"
                disabled={locked || !title.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:opacity-50"
              >
                <PlusIcon className="h-4 w-4" />
                {working ? 'Creating…' : 'Create project'}
              </button>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Posts <code className="font-mono">{'{ title }'}</code> to{' '}
                <code className="font-mono">/api/sandbox/project</code>, then you
                can boot it straight away.
              </p>
            </form>
          </section>
        </div>

        <p className="mt-10 font-mono text-[11px] text-slate-600">
          GET /api/sandbox/projects · POST /api/sandbox/project · POST
          /api/sandbox/start — all called with credentials (httpOnly auth
          cookie).
        </p>
      </main>
    </div>
  )
}
