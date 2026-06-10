interface IntroViewProps {
  onStart: () => void
}

export function IntroView({ onStart }: IntroViewProps) {
  return (
    <section className="view">
      <p>
        Estimate your body measurements with your camera. Everything runs on
        your device — no photo or video ever leaves it.
      </p>
      <button type="button" className="primary" onClick={onStart}>
        Start
      </button>
    </section>
  )
}
