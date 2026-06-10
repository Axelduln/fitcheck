import { useState } from 'react'
import { IntroView } from './components/IntroView'
import { CaptureView } from './components/CaptureView'
import { ResultsView } from './components/ResultsView'
import './App.css'

export type View = 'intro' | 'capture' | 'results'

function App() {
  const [view, setView] = useState<View>('intro')

  return (
    <main className={view === 'capture' ? 'app app--wide' : 'app'}>
      <h1 className="app-title">FitCheck</h1>
      {view === 'intro' && <IntroView onStart={() => setView('capture')} />}
      {view === 'capture' && <CaptureView onDone={() => setView('results')} />}
      {view === 'results' && <ResultsView onRestart={() => setView('intro')} />}
    </main>
  )
}

export default App
