import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app">
          <h1 className="app-title">FitCheck</h1>
          <div className="camera-error">
            <p>Something went wrong.</p>
            <p>
              FitCheck needs a recent browser with camera, WebGL and WebAssembly
              support. Reload the page to try again.
            </p>
            <button
              type="button"
              className="primary"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
