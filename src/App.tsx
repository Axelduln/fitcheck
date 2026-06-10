import { useState } from 'react'
import { IntroView } from './components/IntroView'
import { CaptureWizard } from './components/CaptureWizard'
import { ResultsView } from './components/ResultsView'
import type { CaptureResult } from './lib/captureSession'
import './App.css'

export type View = 'intro' | 'capture' | 'results'

function App() {
  const [view, setView] = useState<View>('intro')
  const [capture, setCapture] = useState<CaptureResult | null>(null)

  return (
    <main className={view === 'capture' ? 'app app--wide' : 'app'}>
      <h1 className="app-title">FitCheck</h1>
      {view === 'intro' && <IntroView onStart={() => setView('capture')} />}
      {view === 'capture' && (
        <CaptureWizard
          onComplete={(result) => {
            setCapture(result)
            setView('results')
          }}
        />
      )}
      {view === 'results' && (
        <ResultsView capture={capture} onRestart={() => setView('capture')} />
      )}
    </main>
  )
}

export default App
