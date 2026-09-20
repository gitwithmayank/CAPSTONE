import { useState } from 'react'
import Landing from './components/Landing.jsx'
import LaunchScreen from './components/LaunchScreen.jsx'
import ProjectPicker from './components/ProjectPicker.jsx'
import Workspace from './components/Workspace.jsx'
import {
  createProject,
  detectBackend,
  listProjects,
  normalizeProject,
  normalizeProjects,
  randomId,
  signInWithGoogle,
  startSandbox,
} from './lib/sandbox.js'

// Flow: landing → projects → launching → workspace
//
// The sandbox backend is a separate, cookie-protected service
// (k8s/ingress.yml routes /api/sandbox → sandbox-service):
//   GET  /api/sandbox/projects  list the signed-in user's projects
//   POST /api/sandbox/project   create a project ({ title })
//   POST /api/sandbox/start     provision a sandbox ({ projectId })
// All calls go through lib/sandbox.js with `credentials: 'include'`.
function App() {
  const [phase, setPhase] = useState('landing')
  const [sandboxId, setSandboxId] = useState(null)
  const [projectId, setProjectId] = useState(null)
  const [live, setLive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [projects, setProjects] = useState([])
  const [needsAuth, setNeedsAuth] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // GET /api/sandbox/projects — also tells us whether the visitor has a valid
  // session cookie (401 → sign in with Google first). Called when the project
  // step opens and by the picker's Refresh button (no fetch on first paint:
  // the landing page does not depend on it).
  async function loadProjects() {
    setBusy(true)
    try {
      const data = await listProjects()
      setProjects(normalizeProjects(data))
      setNeedsAuth(false)
      setError('')
      return true
    } catch (err) {
      if (err.status === 401) setNeedsAuth(true)
      else setError(err.message)
      setProjects([])
      return false
    } finally {
      setBusy(false)
    }
  }

  // POST /api/sandbox/project { title }
  async function handleCreateProject(title) {
    setBusy(true)
    setError('')
    try {
      const data = await createProject(title)
      const created = normalizeProject(data)
      if (created) {
        setProjects((prev) => [created, ...prev.filter((p) => p.id !== created.id)])
      }
      return created
    } catch (err) {
      if (err.status === 401) setNeedsAuth(true)
      setError(err.message)
      return null
    } finally {
      setBusy(false)
    }
  }

  // "Start sandbox" on the landing page → pick or create a project first.
  async function handleStart() {
    setError('')
    setPhase('projects')
    await loadProjects()
  }

  // POST /api/sandbox/start { projectId }
  async function handleLaunch(selectedProjectId) {
    const id = selectedProjectId ?? projectId
    if (!id) {
      setError('Pick a project before starting a sandbox')
      return
    }

    setError('')
    setProjectId(id)
    setSandboxId(randomId()) // optimistic id for the launch screen
    setPhase('launching')

    // Ask the real sandbox backend (cluster ingress) to provision a sandbox.
    // If it is not reachable we fall back to the local demo sandbox.
    const online = await detectBackend()
    if (!online) {
      setPreviewUrl(null)
      setLive(false)
      return
    }

    setBusy(true)
    try {
      const created = await startSandbox(id)
      setSandboxId(created.sandboxId)
      setPreviewUrl(created.previewUrl)
      setLive(true)
    } catch (err) {
      if (err.status === 401) setNeedsAuth(true)
      setError(err.message)
      setPreviewUrl(null)
      setLive(false)
    } finally {
      setBusy(false)
    }
  }

  if (phase === 'projects') {
    return (
      <ProjectPicker
        projects={projects}
        needsAuth={needsAuth}
        busy={busy}
        error={error}
        onSignIn={signInWithGoogle}
        onReload={loadProjects}
        onCreate={handleCreateProject}
        onStart={handleLaunch}
        onBack={() => setPhase('landing')}
      />
    )
  }

  if (phase === 'launching') {
    return (
      <LaunchScreen
        sandboxId={sandboxId}
        onDone={() => setPhase('workspace')}
      />
    )
  }

  if (phase === 'workspace') {
    return (
      <Workspace
        key={sandboxId}
        sandboxId={sandboxId}
        projectId={projectId}
        live={live}
        previewUrl={previewUrl}
        onNewSandbox={() => setPhase('landing')}
      />
    )
  }

  return <Landing onStart={handleStart} />
}

export default App
