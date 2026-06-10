interface ResultsViewProps {
  onRestart: () => void
}

export function ResultsView({ onRestart }: ResultsViewProps) {
  return (
    <section className="view">
      <p>Results view — measurements and sizing arrive in Milestone 5.</p>
      <button type="button" className="primary" onClick={onRestart}>
        Measure again
      </button>
    </section>
  )
}
