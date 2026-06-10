import { CameraView } from './CameraView'

interface CaptureViewProps {
  onDone: () => void
}

export function CaptureView({ onDone }: CaptureViewProps) {
  return (
    <section className="view">
      <CameraView />
      <button type="button" className="primary" onClick={onDone}>
        Continue
      </button>
    </section>
  )
}
