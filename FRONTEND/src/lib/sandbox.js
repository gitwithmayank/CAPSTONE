// ---------------------------------------------------------------------------
// Sandbox helper layer.
//
// The exact contract of the (separate) backend service is not assumed here:
// we always try a handful of sensible endpoints first, and when none respond
// we fall back to a local prompt-driven generator so the whole experience
// (chat -> AI -> live preview) works end to end in the browser alone.
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function randomId(prefix = 'sb', size = 8) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < size; i += 1) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `${prefix}-${id}`
}

export function titleCase(text) {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

function inferAccent(prompt = '') {
  const p = prompt.toLowerCase()
  const themes = [
    ['purple', '#7c3aed'],
    ['violet', '#7c3aed'],
    ['indigo', '#4f46e5'],
    ['blue', '#2563eb'],
    ['cyan', '#0891b2'],
    ['teal', '#0d9488'],
    ['green', '#059669'],
    ['emerald', '#10b981'],
    ['lime', '#65a30d'],
    ['yellow', '#ca8a04'],
    ['amber', '#d97706'],
    ['orange', '#ea580c'],
    ['red', '#dc2626'],
    ['rose', '#e11d48'],
    ['pink', '#db2777'],
  ]
  for (const [name, color] of themes) {
    if (p.includes(name)) return color
  }
  return '#7c3aed'
}

function inferKind(prompt = '') {
  const p = prompt.toLowerCase()
  const kinds = [
    ['dashboard', 'dashboard'],
    ['admin', 'dashboard'],
    ['analytics', 'dashboard'],
    ['login', 'login'],
    ['sign in', 'login'],
    ['signin', 'login'],
    ['pricing', 'pricing'],
    ['plan', 'pricing'],
    ['portfolio', 'portfolio'],
    ['resume', 'portfolio'],
    ['personal', 'portfolio'],
    ['blog', 'blog'],
    ['article', 'blog'],
    ['news', 'blog'],
    ['store', 'store'],
    ['shop', 'store'],
    ['ecommerce', 'store'],
    ['product', 'store'],
    ['todo', 'todo'],
    ['task', 'todo'],
    ['kanban', 'todo'],
    ['landing', 'landing'],
    ['homepage', 'landing'],
    ['startup', 'landing'],
    ['saas', 'landing'],
    ['marketing', 'landing'],
  ]
  for (const [keyword, kind] of kinds) {
    if (p.includes(keyword)) return kind
  }
  return 'landing'
}

// ---------------------------------------------------------------------------
// Live-backend helpers.
//
// The sandbox backend lives in the cluster and is reachable through the nginx
// ingress (see k8s/ingress.yml):
//   GET  /api/sandbox/health   -> sandbox-server health
//   POST /api/sandbox/start    -> creates a pod + service, returns { sandboxId, previewUrl }
//   POST /api/ai/invoke      -> ai-orchestration SSE stream (message + projectId)
//
// If the backend is not reachable we skip the network entirely and use the
// local prompt-driven generator below. VITE_API_URL can override the base when
// the frontend is not served behind the same ingress (e.g. served static).
// ---------------------------------------------------------------------------

const BACKEND_TIMEOUT = 4000

export async function detectBackend() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), BACKEND_TIMEOUT)
  try {
    const res = await fetch(`${API_BASE}/api/sandbox/health`, { signal: controller.signal })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export async function createSandbox() {
  const res = await fetch(`${API_BASE}/api/sandbox/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (!res.ok) throw new Error(`Sandbox backend responded with ${res.status}`)
  const json = await res.json().catch(() => null)
  if (!json?.sandboxId) throw new Error('Sandbox backend did not return a sandboxId')
  return {
    sandboxId: json.sandboxId,
    previewUrl: json.previewUrl || `http://${json.sandboxId}.preview.localhost`,
  }
}

// Streams a prompt to the ai-orchestration agent and gathers the SSE frames.
// Returns a { message, backend, live } result, or null when the call fails.
async function invokeAgent(prompt, projectId, { onStatus, onChunk } = {}) {
  onStatus?.('Sending prompt to the AI builder…')
  const res = await fetch(`${API_BASE}/api/ai/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: prompt, projectId }),
  })
  if (!res.ok) return null

  const text = await res.text()
  const frames = []
  for (const line of text.split('\n')) {
    if (!line.startsWith('data:')) continue
    const data = line.replace(/^data:\s*/, '').trim()
    if (!data) continue
    frames.push(data)
  }
  if (!frames.length) return null

  const parsed = frames
    .map((f) => {
      try {
        return JSON.parse(f)
      } catch {
        return f
      }
    })

  // Surface backend errors (bad API key, model failure, …) instead of
  // pretending the build succeeded.
  for (const frame of parsed) {
    if (frame && frame.error) {
      onStatus?.('Backend reported an error — check the AI service logs')
      return { message: `Backend error: ${frame.error}`, backend: true, live: true }
    }
  }

  const payloads = parsed.filter(
    (f) => typeof f === 'string' || (f && (f.content || f.message || f.data || f.output)),
  )

  onChunk?.(frames[frames.length - 1])

  const last = payloads[payloads.length - 1]
  let reply = null
  if (typeof last === 'string') {
    reply = last
  } else if (last) {
    reply = last.content ?? last.message ?? last.data ?? last.output
  }
  if (typeof reply === 'string' && reply.trim()) {
    onStatus?.('AI finished — refreshing preview')
    return { message: reply.slice(0, 4000), backend: true, live: true }
  }

  return { message: 'Done — sandbox files are updated, check the preview.', backend: true, live: true }
}

// ---------------------------------------------------------------------------
// Public API used by the UI
// ---------------------------------------------------------------------------

export async function chatWithAI(prompt, { projectId, onStatus, onChunk } = {}) {
  if (typeof prompt !== 'string' || prompt.trim() === '') {
    throw new Error('Prompt cannot be empty')
  }

  // Live mode: the workspace came from the real sandbox backend, so we ask
  // the cluster agent to write the files into the sandbox directly.
  if (projectId) {
    onStatus?.('Talking to the AI builder…')
    try {
      const live = await invokeAgent(prompt, projectId, { onStatus, onChunk })
      if (live) return live
    } catch {
      // fall through to the local generator
    }
    onStatus?.('Cloud builder unavailable — generating locally…')
  }

  // Local fallback generation (staged so the UI feels alive)
  onStatus?.('Analyzing your request…')
  await sleep(650)
  onStatus?.('Designing layout & choosing palette…')
  await sleep(650)
  onStatus?.('Writing components & styles…')
  await sleep(700)

  const kind = inferKind(prompt)
  const accent = inferAccent(prompt)
  const html = buildSite({ prompt, kind, accent })
  const message = `Built a **${titleCase(kind)}** page with accent color **#${accent.replace('#', '')}**. Tell me what to tweak — layout, colors, sections or copy.`

  return { html, message, backend: false, kind, accent }
}

export function starterSandbox() {
  return buildSite({
    prompt: 'Build a clean developer landing page',
    kind: 'landing',
    accent: '#7c3aed',
    starter: true,
  })
}

// ---------------------------------------------------------------------------
// Local generator — builds a modern, self-contained HTML page from a prompt.
// ---------------------------------------------------------------------------

function brandFromPrompt(prompt) {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
  if (words.length === 0) return 'Acme'
  return titleCase(words.join(' '))
}

function heroCopyFor(kind, brand) {
  switch (kind) {
    case 'dashboard':
      return {
        badge: 'Analytics dashboard',
        title: 'Everything about your product, in one place',
        sub: 'A clean overview of metrics, activity and billing, ready to wire up to your data.',
        cta: 'Open dashboard',
      }
    case 'login':
      return {
        badge: 'Secure sign in',
        title: 'Welcome back',
        sub: 'Sign in to continue to your account. Your session is encrypted end to end.',
        cta: 'Sign in',
      }
    case 'pricing':
      return {
        badge: 'Simple pricing',
        title: `Pricing that scales with ${brand}`,
        sub: 'Start free, upgrade when you grow. No hidden fees, cancel anytime.',
        cta: 'Start free',
      }
    case 'portfolio':
      return {
        badge: 'Creative developer',
        title: 'Designing interfaces people remember',
        sub: 'I turn ideas into fast, accessible products, spanning brand, web and product design.',
        cta: 'See my work',
      }
    case 'blog':
      return {
        badge: 'Stories & tutorials',
        title: 'Notes from the edge of the web',
        sub: 'Long-form writing about design, engineering and building for the modern web.',
        cta: 'Read the latest',
      }
    case 'store':
      return {
        badge: 'Limited drop',
        title: 'New collection, on sale now',
        sub: `Hand-picked goods from ${brand}. Free shipping over $50 and 30-day returns.`,
        cta: 'Shop the drop',
      }
    case 'todo':
      return {
        badge: 'Task board',
        title: 'Plan the day, ship the week',
        sub: 'A distraction-free board for your tasks. Create, organise and get things done.',
        cta: 'Create a task',
      }
    default:
      return {
        badge: `${brand} — what we do`,
        title: 'Build something people love',
        sub: 'A high-converting, modern marketing page generated from your prompt. Perfect as a starting point.',
        cta: 'Get started',
      }
  }
}

function navLinksFor(kind) {
  const map = {
    dashboard: ['Overview', 'Reports', 'Billing', 'Settings'],
    login: ['Sign in', 'Create account', 'Help'],
    pricing: ['Features', 'Pricing', 'FAQ', 'Contact'],
    portfolio: ['Work', 'About', 'Contact'],
    blog: ['Latest', 'Tutorials', 'About'],
    store: ['Shop', 'New', 'Sale', 'Support'],
    todo: ['Today', 'Week', 'Archive'],
    landing: ['Features', 'Pricing', 'Log in'],
  }
  const links = map[kind] ?? map.landing
  return links.map((l) => `<a href="#">${l}</a>`).join('')
}

// Root variable block shared by every generated page. The accent color is
// injected at build time by globalCss() below.
const ROOT_VARS = '--accent-soft:color-mix(in srgb,var(--accent) 16%,transparent);--accent-border:color-mix(in srgb,var(--accent) 45%,transparent);--bg:#07080f;--panel:#0d0f1a;--panel-2:#111423;--text:#cbd5e1;--muted:#8a93a6;--heading:#f8fafc;--line:rgba(148,163,184,.14)'

// Global CSS used inside every generated preview page.
const CSS_PART_ONE = `*{box-sizing:border-box;margin:0;padding:0}
body{background:#05060d;color:var(--text);font-family:Inter,system-ui,'Segoe UI',Roboto,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
.sg-bg{position:fixed;inset:0;z-index:-2;background:radial-gradient(ellipse 55% 45% at 15% -5%,color-mix(in srgb,var(--accent) 22%,transparent),transparent 60%),radial-gradient(ellipse 45% 40% at 90% 0%,rgba(56,189,248,.12),transparent 55%),#05060d}
.sg-orb{position:absolute;border-radius:999px;filter:blur(90px);opacity:.5}
.sg-orb-a{width:420px;height:420px;left:-120px;top:20%;background:color-mix(in srgb,var(--accent) 55%,transparent)}
.sg-orb-b{width:360px;height:360px;right:-100px;bottom:0%;background:rgba(56,189,248,.28)}
.sg-container{width:min(1080px,100% - 48px);margin:0 auto}
.sg-nav{position:fixed;inset:0 0 auto;z-index:10;background:rgba(7,8,15,.72);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.sg-nav-inner{display:flex;align-items:center;justify-content:space-between;gap:24px;height:64px}
.sg-brand{font-weight:700;color:var(--heading);font-size:18px;text-decoration:none;display:flex;align-items:center;gap:10px;letter-spacing:.2px}
.sg-brand::before{content:"\\25C6";color:var(--accent)}
.sg-nav-links{display:flex;gap:26px;align-items:center}
.sg-nav-links a{color:var(--muted);text-decoration:none;font-size:14px;font-weight:500;transition:color .2s}
.sg-nav-links a:hover{color:var(--heading)}
.sg-mobile-toggle{display:none}
.sg-btn{display:inline-flex;align-items:center;gap:8px;border:0;cursor:pointer;font-weight:600;text-decoration:none;font-size:15px;border-radius:10px;padding:0 18px;height:42px;transition:transform .15s,box-shadow .2s,background .2s}
.sg-btn:active{transform:translateY(1px)}
.sg-btn-primary{background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 60%,#6366f1));color:#fff;box-shadow:0 10px 26px -10px color-mix(in srgb,var(--accent) 70%,transparent)}
.sg-btn-primary:hover{transform:translateY(-1px);box-shadow:0 16px 30px -12px color-mix(in srgb,var(--accent) 80%,transparent)}
.sg-btn-ghost{background:transparent;color:var(--heading);border:1px solid var(--line)}
.sg-btn-ghost:hover{border-color:var(--accent-border);background:var(--accent-soft)}
.sg-hero{position:relative;padding:168px 0 96px;text-align:center}
.sg-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;background:var(--accent-soft);border:1px solid var(--accent-border);color:var(--heading);font-size:13px;font-weight:600;letter-spacing:.3px;text-transform:uppercase}
.sg-badge::before{content:"";width:8px;height:8px;border-radius:999px;background:var(--accent);box-shadow:0 0 12px var(--accent)}
.sg-hero h1{font-size:clamp(38px,6vw,64px);line-height:1.06;letter-spacing:-1.5px;color:var(--heading);margin:26px auto 18px;max-width:820px}
.sg-hero h1 em{font-style:normal;background:linear-gradient(120deg,var(--accent),#60a5fa);-webkit-background-clip:text;background-clip:text;color:transparent}
.sg-hero p{max-width:580px;margin:0 auto 34px;color:var(--muted);font-size:18px}
.sg-hero-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.sg-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:64px}
.sg-stat{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:22px;text-align:left}
.sg-stat b{display:block;font-size:30px;color:var(--heading);letter-spacing:-.5px}
.sg-stat span{color:var(--muted);font-size:14px}
.sg-section{padding:72px 0}
.sg-eyebrow{color:var(--accent);font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase}
.sg-section h2{font-size:clamp(26px,4vw,38px);color:var(--heading);letter-spacing:-.6px;margin:10px 0 14px}
.sg-section .sg-sub{color:var(--muted);max-width:560px;margin-bottom:40px}
.sg-grid{display:grid;gap:18px}
.sg-grid-3{grid-template-columns:repeat(3,1fr)}
.sg-grid-2{grid-template-columns:repeat(2,1fr)}
.sg-grid-4{grid-template-columns:repeat(4,1fr)}
.sg-card{position:relative;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:24px;transition:transform .18s,border-color .18s;text-align:left;overflow:hidden}
.sg-card::before{content:"";position:absolute;inset:0 0 auto;height:2px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:0;transition:opacity .2s}
.sg-card:hover{transform:translateY(-3px);border-color:var(--accent-border)}
.sg-card:hover::before{opacity:1}
.sg-card .sg-emoji{font-size:26px}
.sg-card h3{color:var(--heading);font-size:18px;margin:14px 0 8px}
.sg-card p{color:var(--muted);font-size:14px}`
const CSS_PART_TWO = `.sg-cta{padding:72px 0 110px}
.sg-cta-box{position:relative;overflow:hidden;text-align:center;background:linear-gradient(135deg,var(--accent-soft),rgba(99,102,241,.14));border:1px solid var(--accent-border);border-radius:24px;padding:64px 32px}
.sg-cta-box h2{color:var(--heading);font-size:clamp(26px,4vw,40px);letter-spacing:-.6px;margin-bottom:12px}
.sg-cta-box p{color:var(--muted);margin-bottom:28px}
.sg-cta-box .sg-hero-actions{justify-content:center}
.sg-footer{border-top:1px solid var(--line);padding:34px 0;text-align:center;color:var(--muted);font-size:14px}
.sg-form{display:grid;gap:14px;max-width:420px;margin:0 auto;text-align:left}
.sg-label{font-size:13px;font-weight:600;color:var(--heading)}
.sg-input{height:44px;padding:0 14px;border-radius:10px;background:var(--panel-2);border:1px solid var(--line);color:var(--heading);font-size:15px;outline:none}
.sg-input:focus{border-color:var(--accent-border);box-shadow:0 0 0 3px var(--accent-soft)}
.sg-actions{display:flex;gap:10px;justify-content:space-between;align-items:center}
.sg-link{color:var(--accent);text-decoration:none;font-size:14px;font-weight:600}
.sg-table{width:100%;border-collapse:collapse;text-align:left;background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.sg-table th{font-size:12px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);padding:14px 18px;border-bottom:1px solid var(--line)}
.sg-table td{padding:14px 18px;border-bottom:1px solid var(--line);font-size:14px;color:var(--text)}
.sg-table tr:last-child td{border-bottom:0}
.sg-up{color:#34d399}
.sg-down{color:#f87171}
.sg-pill{display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;background:var(--accent-soft);color:var(--heading);border:1px solid var(--accent-border)}
.sg-bar{height:8px;border-radius:999px;background:rgba(148,163,184,.15);overflow:hidden;margin-top:10px}
.sg-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--accent),#60a5fa)}
.sg-price b{font-size:44px;color:var(--heading);letter-spacing:-1px}
.sg-price small{color:var(--muted)}
.sg-featured{position:relative}
.sg-featured::after{content:"Popular";position:absolute;top:14px;right:14px;padding:4px 10px;border-radius:999px;background:var(--accent);color:#fff;font-size:11px;font-weight:700;letter-spacing:.4px}
.sg-prod img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px;display:block;background:var(--panel-2)}
.sg-prod .sg-pill{margin-top:12px}
.sg-prod h3{margin:12px 0 4px}
.sg-prod p{margin-bottom:12px}
.sg-price-row{display:flex;align-items:center;justify-content:space-between}
.sg-columns{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.sg-col{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:16px}
.sg-col h3{font-size:14px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:14px}
.sg-task{background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:10px;font-size:14px;color:var(--heading)}
.sg-task small{display:block;color:var(--muted);margin-top:4px}
@media(max-width:820px){.sg-grid-3,.sg-grid-4,.sg-grid-2,.sg-columns{grid-template-columns:1fr}.sg-stats{grid-template-columns:1fr}.sg-nav-links{display:none;position:absolute;top:64px;left:0;right:0;flex-direction:column;background:rgba(7,8,15,.96);border-bottom:1px solid var(--line);padding:18px;gap:16px}.sg-nav-links.open{display:flex}.sg-mobile-toggle{display:inline-flex}.sg-hero{padding:140px 0 64px}}`

function globalCss(accent) {
  return `:root{--accent:${accent};${ROOT_VARS}}${CSS_PART_ONE}${CSS_PART_TWO}`
}

function shell({ title, brand, kind, accent, starter, bodyHtml }) {
  const navLinks = navLinksFor(kind)
  const badge = starter ? 'Starter template' : 'Generated live · HMR enabled'
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${title} — ${brand}</title>
<style>${globalCss(accent)}</style>
</head>
<body>
<div class="sg-bg"><div class="sg-orb sg-orb-a"></div><div class="sg-orb sg-orb-b"></div></div>
<nav class="sg-nav">
  <div class="sg-container sg-nav-inner">
    <a class="sg-brand" href="#">${brand}</a>
    <div class="sg-nav-links">${navLinks}</div>
    <a class="sg-btn sg-btn-primary sg-mobile-toggle" href="#start">${starter ? 'Edit me' : 'Get started'}</a>
  </div>
</nav>
${bodyHtml}
<footer class="sg-footer">
  <div class="sg-container">${brand} · generated on the fly in your sandbox · <b style="color:var(--accent)">${badge}</b></div>
</footer>
<script>
document.querySelector('.sg-mobile-toggle')?.addEventListener('click',function(){document.querySelector('.sg-nav-links')?.classList.toggle('open')});
</script>
</body>
</html>`
}

function pageTitle(prompt, kind) {
  const fallback = {
    landing: 'Landing page',
    dashboard: 'Dashboard',
    login: 'Sign in',
    pricing: 'Pricing',
    portfolio: 'Portfolio',
    blog: 'Blog',
    store: 'Store',
    todo: 'Tasks',
  }
  const words = prompt
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 4)
  if (words.length > 0) return titleCase(words.join(' '))
  return fallback[kind] ?? 'Website'
}

function heroHtml(hero, starter) {
  const secondary = starter ? '' : '<a class="sg-btn sg-btn-ghost" href="#secondary">Learn more</a>'
  return `<header class="sg-container sg-hero" id="start">
  <span class="sg-badge">${hero.badge}</span>
  <h1>${hero.title}</h1>
  <p>${hero.sub}</p>
  <div class="sg-hero-actions"><a class="sg-btn sg-btn-primary" href="#start">${hero.cta}</a>${secondary}</div>
</header>`
}

function ctaBand(label) {
  return `<section class="sg-container sg-cta" id="secondary"><div class="sg-cta-box"><h2>Ready when you are</h2><p>Everything above was generated from a single prompt. Ask the chat to tweak any detail.</p><div class="sg-hero-actions"><a class="sg-btn sg-btn-primary" href="#start">${label}</a></div></div></section>`
}

function landingBody({ hero, starter }) {
  const features = [
    ['⚡', 'Instant reload', 'Hot module replacement in milliseconds, zero config.'],
    ['🧩', 'Reusable blocks', 'Compose your page from components, then swap them out.'],
    ['📈', 'Built for conversion', 'Heroes, CTAs and social proof that move real metrics.'],
  ]
  const featureCards = features
    .map(([e, t, d]) => `<article class="sg-card"><span class="sg-emoji">${e}</span><h3>${t}</h3><p>${d}</p></article>`)
    .join('')
  const stats = [
    ['99.9%', 'Uptime SLA'],
    ['12k+', 'Teams onboard'],
    ['40ms', 'P95 latency'],
  ]
  const statHtml = stats
    .map(([n, l]) => `<div class="sg-stat"><b>${n}</b><span>${l}</span></div>`)
    .join('')
  return `${heroHtml(hero, starter)}
<section class="sg-container sg-section">
  <div class="sg-stats">${statHtml}</div>
</section>
<section class="sg-container sg-section" id="features">
  <span class="sg-eyebrow">Features</span>
  <h2>Everything you need to launch</h2>
  <p class="sg-sub">A curated starter kit that looks great out of the box and stays easy to change.</p>
  <div class="sg-grid sg-grid-3">${featureCards}</div>
</section>
${ctaBand(hero.cta)}`
}

function dashboardBody({ hero, starter }) {
  const kpis = [
    ['$12,340', 'Revenue', 72],
    ['8,421', 'Active users', 54],
    ['3.2%', 'Conversion', 31],
    ['1h 12m', 'Avg session', 64],
  ]
  const kpiHtml = kpis
    .map(([v, l, p]) => `<div class="sg-stat"><b>${v}</b><span>${l}</span><div class="sg-bar"><i style="width:${p}%"></i></div></div>`)
    .join('')
  const rows = [
    ['Growth plan', '$12,340', '+18%', 'sg-up'],
    ['Pro plan', '$3,104', '+9%', 'sg-up'],
    ['Starter plan', '$1,982', '-4%', 'sg-down'],
    ['Enterprise', '$52,741', '+22%', 'sg-up'],
  ]
  const rowHtml = rows
    .map(
      (r) =>
        `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="${r[3]}">${r[2]}</td><td><span class="sg-pill">${r[3] === 'sg-up' ? 'Growing' : 'Dipping'}</span></td></tr>`,
    )
    .join('')
  return `${heroHtml(hero, starter)}
<section class="sg-container sg-section">
  <div class="sg-grid sg-grid-4">${kpiHtml}</div>
</section>
<section class="sg-container sg-section">
  <span class="sg-eyebrow">Monthly breakdown</span>
  <h2>Revenue by plan</h2>
  <table class="sg-table"><thead><tr><th>Plan</th><th>MRR</th><th>Change</th><th>Trend</th></tr></thead><tbody>${rowHtml}</tbody></table>
</section>
${ctaBand(hero.cta)}`
}

function loginBody({ hero }) {
  return `${heroHtml(hero, false)}
<section class="sg-container sg-section">
  <form class="sg-form" onsubmit="alert('Demo form — connect your auth service next.');return false">
    <label class="sg-label" for="email">Email</label>
    <input class="sg-input" id="email" type="email" placeholder="you@company.com"/>
    <label class="sg-label" for="password">Password</label>
    <input class="sg-input" id="password" type="password" placeholder="••••••••"/>
    <div class="sg-actions"><label style="font-size:14px;color:var(--muted)"><input type="checkbox"/> Remember me</label><a class="sg-link" href="#">Forgot password?</a></div>
    <button class="sg-btn sg-btn-primary" type="submit">${hero.cta}</button>
    <p style="text-align:center;font-size:14px;color:var(--muted)">No account? <a class="sg-link" href="#">Create one</a></p>
  </form>
</section>`
}

function pricingBody({ hero, starter }) {
  const plans = [
    { name: 'Starter', price: '$0', tag: 'For side projects', cta: 'Start free', featured: false, feats: ['1 project', 'Community support', 'Sandbox previews'] },
    { name: 'Pro', price: '$19', tag: 'For growing teams', cta: 'Go Pro', featured: true, feats: ['Unlimited projects', 'Priority support', 'Custom domains', 'API access'] },
    { name: 'Scale', price: '$79', tag: 'For businesses', cta: 'Contact sales', featured: false, feats: ['SSO & audit logs', 'Dedicated support', 'SLA', 'Onboarding'] },
  ]
  const planHtml = plans
    .map(
      (plan) =>
        `<article class="sg-card ${plan.featured ? 'sg-featured' : ''}"><span class="sg-eyebrow">${plan.name}</span><div class="sg-price" style="margin-top:10px"><b>${plan.price}</b> <small>/ month</small></div><p style="margin:14px 0 18px">${plan.tag}</p>${plan.feats.map((f) => `<p style="margin:8px 0;font-size:14px">✓ ${f}</p>`).join('')}<div class="sg-hero-actions" style="margin-top:22px"><a class="sg-btn ${plan.featured ? 'sg-btn-primary' : 'sg-btn-ghost'}" href="#start">${plan.cta}</a></div></article>`,
    )
    .join('')
  return `${heroHtml(hero, starter)}
<section class="sg-container sg-section">
  <div class="sg-grid sg-grid-3">${planHtml}</div>
</section>
${ctaBand(hero.cta)}`
}

function portfolioBody({ hero, starter }) {
  const works = [
    ['🎨', 'Brand system', 'Identity, tokens and guidelines for a fintech scale-up.'],
    ['🛠️', 'Design tool', 'A plugin that turned mockups into production-grade CSS.'],
    ['🌐', 'Web app', 'A real-time dashboard serving 40k monthly sessions.'],
  ]
  const workCards = works
    .map(
      ([e, t, d]) =>
        `<article class="sg-card sg-prod"><div style="width:100%;aspect-ratio:16/10;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:44px;background:var(--panel-2);border:1px solid var(--line)">${e}</div><h3>${t}</h3><p>${d}</p></article>`,
    )
    .join('')
  const skills = ['Product design', 'React', 'Systems thinking', 'Motion', 'Design tokens', 'Accessibility']
  const skillHtml = skills.map((s) => `<span class="sg-pill">${s}</span>`).join(' ')
  return `${heroHtml(hero, starter)}
<section class="sg-container sg-section">
  <span class="sg-eyebrow">Selected work</span>
  <h2>Things I have shipped</h2>
  <div class="sg-grid sg-grid-3">${workCards}</div>
</section>
<section class="sg-container sg-section" id="secondary">
  <span class="sg-eyebrow">Toolkit</span>
  <h2>Skills & tools</h2>
  <div style="display:flex;gap:10px;flex-wrap:wrap">${skillHtml}</div>
  <div style="margin-top:36px" class="sg-hero-actions"><a class="sg-btn sg-btn-primary" href="#start">${hero.cta}</a></div>
</section>`
}

function blogBody({ hero }) {
  const posts = [
    ['Designing for speed', 'How a 200ms first paint changed our bounce rate forever.', '12 min'],
    ['The new CSS you should use', 'A practical tour of modern layout and color primitives.', '8 min'],
    ['Shipping with AI copilots', 'Lessons from building alongside a chat-first workflow.', '15 min'],
  ]
  const postCards = posts
    .map(([t, d, m]) => `<article class="sg-card"><span class="sg-pill">${m} read</span><h3>${t}</h3><p>${d}</p><a class="sg-link" href="#start">Read article →</a></article>`)
    .join('')
  return `${heroHtml(hero, false)}
<section class="sg-container sg-section">
  <span class="sg-eyebrow">Latest writing</span>
  <h2>From the blog</h2>
  <div class="sg-grid sg-grid-3">${postCards}</div>
</section>
<section class="sg-container sg-section" id="secondary">
  <form class="sg-form" onsubmit="alert('Subscribed (demo).');return false">
    <span class="sg-eyebrow">Newsletter</span>
    <h2 style="margin-bottom:4px">Never miss a post</h2>
    <p style="color:var(--muted);margin-bottom:8px">One email a week, no spam.</p>
    <input class="sg-input" type="email" placeholder="you@example.com"/>
    <button class="sg-btn sg-btn-primary" type="submit">Subscribe</button>
  </form>
</section>`
}

function storeBody({ hero, starter }) {
  const products = [
    ['🧢', 'Travel cap', '$24.00'],
    ['👕', 'Canvas tee', '$18.00'],
    ['🧥', 'Wool hoodie', '$58.00'],
    ['🎒', 'Weekend bag', '$46.00'],
  ]
  const productHtml = products
    .map(
      ([e, n, pr]) =>
        `<article class="sg-card sg-prod"><div style="width:100%;aspect-ratio:4/3;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:44px;background:var(--panel-2);border:1px solid var(--line)">${e}</div><span class="sg-pill">New</span><h3>${n}</h3><div class="sg-price-row"><b>${pr}</b><a class="sg-btn sg-btn-primary" href="#start" style="height:36px;padding:0 14px;font-size:13px">Add</a></div></article>`,
    )
    .join('')
  return `${heroHtml(hero, starter)}
<section class="sg-container sg-section">
  <span class="sg-eyebrow">The drop</span>
  <h2>Fresh in this week</h2>
  <div class="sg-grid sg-grid-4">${productHtml}</div>
</section>
${ctaBand(hero.cta)}`
}

function todoBody({ hero, starter }) {
  const columns = [
    ['To do', [['Refactor navbar component', '2m ago'], ['Write unit tests', 'Today'], ['Add dark mode toggle', 'Yesterday']]],
    ['In progress', [['Upgrade to Tailwind v4', 'Just now'], ['Add release banner', '30m ago']]],
    ['Done', [['Set up monorepo', 'Feb'], ['Ship landing v1', 'Last week']]],
  ]
  const columnHtml = columns
    .map(
      ([title, tasks]) =>
        `<div class="sg-col"><h3>${title}</h3>${tasks.map(([t, meta]) => `<div class="sg-task">${t}<small>${meta}</small></div>`).join('')}</div>`,
    )
    .join('')
  return `${heroHtml(hero, starter)}
<section class="sg-container sg-section">
  <div class="sg-columns">${columnHtml}</div>
</section>
${ctaBand(hero.cta)}`
}

function bodyFor(kind, ctx) {
  switch (kind) {
    case 'dashboard':
      return dashboardBody(ctx)
    case 'login':
      return loginBody(ctx)
    case 'pricing':
      return pricingBody(ctx)
    case 'portfolio':
      return portfolioBody(ctx)
    case 'blog':
      return blogBody(ctx)
    case 'store':
      return storeBody(ctx)
    case 'todo':
      return todoBody(ctx)
    default:
      return landingBody(ctx)
  }
}

function buildSite({ prompt, kind, accent, starter = false }) {
  const brand = brandFromPrompt(prompt)
  const hero = heroCopyFor(kind, brand)
  const bodyHtml = bodyFor(kind, { hero, starter })
  return shell({ title: pageTitle(prompt, kind), brand, kind, accent, starter, bodyHtml })
}