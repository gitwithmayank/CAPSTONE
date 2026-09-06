import { useState } from 'react'
import Landing from './components/Landing.jsx'
import LaunchScreen from './components/LaunchScreen.jsx'
import Workspace from './components/Workspace.jsx'
import { randomId, detectBackend, createSandbox } from './lib/sandbox.js'

function App() {
  const [phase, setPhase] = useState('landing')
  const [sandboxId, setSandboxId] = useState(null)
  const [live, setLive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)

  async function startSandbox() {
    setSandboxId(randomId())
    setPhase('launching')

    // Ask the real sandbox backend (cluster ingress) to provision a sandbox.
    // If it is not reachable we fall back to the local demo sandbox.
    const online = await detectBackend()
    if (online) {
      try {
        const created = await createSandbox()
        setSandboxId(created.sandboxId)
        setPreviewUrl(created.previewUrl)
        setLive(true)
        return
      } catch {
        // keep the local demo sandbox
      }
    }
    setPreviewUrl(null)
    setLive(false)
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
        live={live}
        previewUrl={previewUrl}
        onNewSandbox={() => setPhase('landing')}
      />
    )
  }

  return <Landing onStart={startSandbox} />
}

export default App
