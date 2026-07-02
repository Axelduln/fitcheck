import { useState } from 'react'
import { IntroView } from './components/IntroView'
import { CaptureWizard } from './components/CaptureWizard'
import { ResultsView } from './components/ResultsView'
import { AboutView } from './components/AboutView'
import type { CaptureResult } from './lib/captureSession'
import './App.css'

export type View = 'intro' | 'capture' | 'results' | 'about'

function App() {
  const [view, setView] = useState<View>('intro')
  const [capture, setCapture] = useState<CaptureResult | null>(null)

  return (
    <main className={view === 'capture' ? 'app app--wide' : 'app'}>
      <div className="bg-fx" aria-hidden="true">
        <span className="bg-orb bg-orb--a" />
        <span className="bg-orb bg-orb--b" />
      </div>
      <header className="brand">
        <svg
          className="brand-mark"
          viewBox="0 0 64 64"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="bm" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#22d3ee" />
              <stop offset="1" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="15" r="7" fill="url(#bm)" />
          <path
            d="M32 25v18M18 32h28M32 43 22 58M32 43l10 15"
            stroke="url(#bm)"
            strokeWidth="5.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <h1 className="app-title">
          Fit<em>Check</em>
        </h1>
        <p className="brand-spec">
          body.scan v1
          <br />
          33 landmarks / 0 uploads
        </p>
      </header>
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
      {view === 'about' && <AboutView onBack={() => setView('intro')} />}
      {view !== 'about' && view !== 'capture' && (
        <button
          type="button"
          className="link-button"
          onClick={() => setView('about')}
        >
          How it works &amp; privacy
        </button>
      )}
    </main>
  )
}

export default App
