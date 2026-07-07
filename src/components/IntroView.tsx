import { useRef } from 'react'

interface IntroViewProps {
  onStart: () => void
}

/**
 * Landing page. The whole page sits on top of a hidden "measurement
 * blueprint" layer — the cursor is a scanner lens that reveals it
 * (radial mask driven by --mx/--my). On touch devices the layer is
 * faintly visible instead.
 */
export function IntroView({ onStart }: IntroViewProps) {
  const wrapRef = useRef<HTMLDivElement>(null)

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    el.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }

  return (
    <div ref={wrapRef} className="landing" onPointerMove={onPointerMove}>
      <div className="scan-reveal" aria-hidden="true">
        <span
          className="anno-line"
          style={{ top: '13%', left: '3%', width: '24%' }}
        />
        <span className="anno" style={{ top: '10%', left: '3%' }}>
          shoulder · 43–44 cm
        </span>
        <span
          className="anno-vline"
          style={{ top: '6%', right: '6%', height: '46%' }}
        />
        <span className="anno" style={{ top: '4%', right: '7.5%' }}>
          stature · 184 cm
        </span>
        <span
          className="anno-ellipse"
          style={{ top: '30%', left: '10%', width: '180px', height: '84px' }}
        />
        <span className="anno" style={{ top: '28%', left: '11%' }}>
          chest ≈ ellipse fit
        </span>
        <span className="anno" style={{ top: '46%', left: '30%' }}>
          L23/L24 · hip line
        </span>
        <span className="anno anno--dim" style={{ top: '21%', left: '52%' }}>
          px→cm × 0.2246
        </span>
        <span className="anno anno--dim" style={{ top: '58%', right: '12%' }}>
          vis 0.98 · Δ deltoid +5 cm
        </span>
        <span className="anno-cross" style={{ top: '17%', left: '44%' }}>
          +
        </span>
        <span className="anno-cross" style={{ top: '38%', right: '22%' }}>
          +
        </span>
        <span className="anno-cross" style={{ top: '64%', left: '18%' }}>
          +
        </span>
        <span
          className="anno-line"
          style={{ top: '70%', left: '40%', width: '18%' }}
        />
        <span className="anno" style={{ top: '66.5%', left: '40%' }}>
          inseam · 87 cm
        </span>
      </div>

      <section className="landing-hero">
        <p className="eyebrow">Free · no sign-up · nothing uploaded</p>
        <h1 className="headline">
          Stop guessing
          <br />
          your <em>size.</em>
        </h1>
        <p className="lede">
          Stand in front of your camera for one minute. FitCheck reads your
          shoulders, arms, legs and chest — then tells you what actually fits.
          Everything runs in your browser.{' '}
          <strong>Nothing leaves your phone.</strong>
        </p>
        <div className="cta-row">
          <button type="button" className="primary" onClick={onStart}>
            Measure me
          </button>
          <span className="cta-note">≈ 60 seconds · phone or laptop</span>
        </div>
      </section>

      <section className="landing-how" id="how">
        <div className="how-step">
          <span>01</span>
          <h3>Type your height</h3>
          <p>
            The only number you enter. It turns camera pixels into centimeters.
          </p>
        </div>
        <div className="how-step">
          <span>02</span>
          <h3>Stand back. Turn once.</h3>
          <p>
            A voice guides you through two poses and takes the shot by itself.
            No timer fumbling.
          </p>
        </div>
        <div className="how-step">
          <span>03</span>
          <h3>Wear what fits</h3>
          <p>
            Seven measurements and your size from S to XXL — honest ranges, not
            fake precision.
          </p>
        </div>
      </section>

      <section className="landing-privacy">
        <h2>No cloud. No account. No cookie banner.</h2>
        <p>
          There's nothing to consent to, because we never see anything. The AI
          runs inside your browser — load the page, switch to airplane mode, and
          it still works. Open your network tab if you don't believe us.
        </p>
      </section>

      <footer className="landing-footer">
        <span>FitCheck — measured on your device</span>
        <a
          href="https://github.com/Axelduln/fitcheck"
          target="_blank"
          rel="noreferrer"
        >
          Source on GitHub
        </a>
      </footer>
    </div>
  )
}
