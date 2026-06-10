interface CaptureViewProps {
  onDone: () => void
}

export function CaptureView({ onDone }: CaptureViewProps) {
  return (
    <section className="view">
      <p>Capture view — camera and pose overlay arrive in Milestone 1.</p>
      <button type="button" className="primary" onClick={onDone}>
        Continue
      </button>
    </section>
  )
}
