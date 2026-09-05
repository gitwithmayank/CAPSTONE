import { useEffect, useState } from 'react'
import { CheckIcon, LogoMark } from './Icons.jsx'

const STEPS = [
  'Reserving sandbox',
  'Mounting project files',
  'Starting dev server',
  'Opening preview',
]

export default function LaunchScreen({ sandboxId, onDone }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (step >= STEPS.length) {
      const t = setTimeout(onDone, 550)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setStep((s) => s + 1), 560)
    return () => clearTimeout(t)
  }, [step, onDone])

  const active = Math.min(step, STEPS.length)

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-[#05060d] px-6 text-center">
      <div className="sb-glow pointer-events-none fixed inset-x-0 top-0 h-96" />

      <div className="sb-rise relative">
        <div className="relative mx-auto h-20 w-20">
          <span className="absolute inset-0 animate-spin rounded-3xl border-2 border-violet-500/20 border-t-violet-400" />
          <span className="absolute inset-2 flex items-center justify-center">
            <LogoMark className="h-full w-full" />
          </span>
        </div>

        <h1 className="mt-8 text-2xl font-bold tracking-tight text-white">
          Creating sandbox
        </h1>
        <p className="mt-2 font-mono text-sm text-violet-300">{sandboxId}</p>

        <ul className="mx-auto mt-9 max-w-xs space-y-3 text-left">
          {STEPS.map((label, i) => {
            const done = i < active
            const current = i === active
            return (
              <li
                key={label}
                className={`flex items-center gap-3 text-sm transition-colors ${
                  done ? 'text-emerald-400' : current ? 'text-white' : 'text-slate-600'
                }`}
              >
                {done ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                ) : current ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-white" />
                ) : (
                  <span className="h-5 w-5 rounded-full border-2 border-white/10" />
                )}
                {label}
              </li>
            )
          })}
        </ul>
      </div>

      <p className="absolute bottom-8 text-xs text-slate-600">
        Sandboxes are instant & isolated
      </p>
    </div>
  )
}