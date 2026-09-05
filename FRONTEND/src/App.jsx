import { useState } from 'react'
import Landing from './components/Landing.jsx'
import LaunchScreen from './components/LaunchScreen.jsx'
import Workspace from './components/Workspace.jsx'
import { randomId } from './lib/sandbox.js'

function App() {
  const [phase, setPhase] = useState('landing')
  const [sandboxId, setSandboxId] = useState(null)

  function startSandbox() {
    setSandboxId(randomId())
    setPhase('launching')
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
      <Workspace key={sandboxId} sandboxId={sandboxId} onNewSandbox={() => setPhase('landing')} />
    )
  }

  return <Landing onStart={startSandbox} />
}

export default App
