interface IntroViewProps {
  onStart: () => void
}

export function IntroView({ onStart }: IntroViewProps) {
  return (
    <section className="view hero">
      <p className="hero-badge">
        <span className="pulse-dot" />
        100% on-device — nothing ever leaves your phone
      </p>
      <h2 className="hero-title">
        Your size,
        <br />
        <span className="grad-text">measured by light.</span>
      </h2>
      <p className="hero-sub">
        Point your camera, step back, and let FitCheck read your body
        measurements and clothing size in about a minute. No account, no
        uploads, no guesswork.
      </p>
      <button type="button" className="primary" onClick={onStart}>
        Start scanning
      </button>
      <ul className="hero-features">
        <li>7 measurements</li>
        <li>Voice guided</li>
        <li>Size S–XXL</li>
        <li>Works offline</li>
      </ul>
      <div className="scan-figure" aria-hidden="true">
        <span className="scan-beam" />
        <svg viewBox="0 0 64 96" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="fig" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#22d3ee" />
              <stop offset="1" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <g
            stroke="url(#fig)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          >
            <circle cx="32" cy="12" r="8" fill="url(#fig)" stroke="none" />
            <path d="M32 24v30M14 34h36M14 34l4 14M50 34l-4 14M32 54 20 88M32 54l12 34" />
          </g>
          <g fill="#e9edf8">
            <circle cx="32" cy="24" r="2.4" />
            <circle cx="14" cy="34" r="2.4" />
            <circle cx="50" cy="34" r="2.4" />
            <circle cx="18" cy="48" r="2.4" />
            <circle cx="46" cy="48" r="2.4" />
            <circle cx="32" cy="54" r="2.4" />
            <circle cx="20" cy="88" r="2.4" />
            <circle cx="44" cy="88" r="2.4" />
          </g>
        </svg>
      </div>
    </section>
  )
}
