import { useRef, useState } from 'react'
import { PoseCaptureStep } from './PoseCaptureStep'
import { ScanLens } from './ScanLens'
import type { CapturedPose, CaptureResult } from '../lib/captureSession'
import { VoiceAnnouncer } from '../lib/speech'

type WizardStep = 'instructions' | 'height' | 'front' | 'side'

interface CaptureWizardProps {
  onComplete: (result: CaptureResult) => void
}

/** Ruler rendering scale: 6 px per cm. */
const RULER_PX_PER_CM = 6
const RULER_MIN_CM = 100
const RULER_MAX_CM = 250
const RULER_FALLBACK_CM = 175

export function CaptureWizard({ onComplete }: CaptureWizardProps) {
  const [step, setStep] = useState<WizardStep>('instructions')
  const [heightInput, setHeightInput] = useState('')
  const [heightCm, setHeightCm] = useState<number | null>(null)
  const [heightError, setHeightError] = useState<string | null>(null)
  const frontRef = useRef<CapturedPose | null>(null)
  const announcerRef = useRef<VoiceAnnouncer | null>(null)

  const announce = (text: string) => {
    announcerRef.current ??= new VoiceAnnouncer()
    announcerRef.current.speak(text, performance.now(), { force: true })
  }

  if (step === 'instructions') {
    return (
      <ScanLens
        contentClassName="view"
        annotations={
          <>
            <span className="anno" style={{ top: '6%', right: '4%' }}>
              pre-flight · 5 checks
            </span>
            <span className="anno anno--dim" style={{ top: '48%', left: '2%' }}>
              audio · voice guidance
            </span>
            <span className="anno-cross" style={{ top: '26%', right: '12%' }}>
              +
            </span>
            <span className="anno-cross" style={{ top: '72%', left: '8%' }}>
              +
            </span>
          </>
        }
      >
        <h2 className="step-title">
          <span className="step-eyebrow">Setup</span>
          Before you start
        </h2>
        <ul className="instructions-list">
          <li>
            <strong>Fitted clothing.</strong>&nbsp;Baggy hides your shape.
          </li>
          <li>
            <strong>Plain background,</strong>&nbsp;even light.
          </li>
          <li>
            <strong>Prop your device</strong>&nbsp;upright at hip height.
          </li>
          <li>
            <strong>Give it 3 meters.</strong>&nbsp;It needs your whole body.
          </li>
          <li>
            <strong>Sound on.</strong>&nbsp;A voice walks you through both poses
            — front, then sideways.
          </li>
        </ul>
        <button
          type="button"
          className="primary"
          onClick={() => setStep('height')}
        >
          I'm ready
        </button>
      </ScanLens>
    )
  }

  if (step === 'height') {
    const parsed = Number(heightInput.replace(',', '.'))
    const rulerCm =
      Number.isFinite(parsed) &&
      parsed >= RULER_MIN_CM &&
      parsed <= RULER_MAX_CM
        ? parsed
        : RULER_FALLBACK_CM

    return (
      <section className="view">
        <h2 className="step-title">
          <span className="step-eyebrow">Calibration</span>
          How tall are you?
        </h2>
        <p className="lede">
          The only number you enter — it turns camera pixels into centimeters.
        </p>
        <form
          className="height-form"
          onSubmit={(e) => {
            e.preventDefault()
            const value = Number(heightInput.replace(',', '.'))
            if (!Number.isFinite(value) || value < 100 || value > 250) {
              setHeightError('Enter your height in cm (100–250).')
              return
            }
            setHeightError(null)
            setHeightCm(value)
            setStep('front')
            announce(
              'Stand about three meters away and face the camera with your whole body visible.',
            )
          }}
        >
          <label htmlFor="height">Height (cm)</label>
          <input
            id="height"
            type="number"
            inputMode="decimal"
            min={100}
            max={250}
            placeholder="180"
            value={heightInput}
            onChange={(e) => setHeightInput(e.target.value)}
          />
          <div className="ruler-wrap" aria-hidden="true">
            <div
              className="ruler"
              style={{
                transform: `translateX(${-rulerCm * RULER_PX_PER_CM}px)`,
              }}
            >
              {Array.from({ length: 16 }, (_, i) => {
                const v = RULER_MIN_CM + i * 10
                return (
                  <span
                    key={v}
                    className="ruler-major"
                    style={{ left: v * RULER_PX_PER_CM }}
                  >
                    {v}
                  </span>
                )
              })}
            </div>
            <span className="ruler-needle" />
          </div>
          {heightError && <p className="form-error">{heightError}</p>}
          <button type="submit" className="primary">
            Use this height
          </button>
        </form>
      </section>
    )
  }

  // Front and side share ONE tree position with no key, so the camera
  // and pose model stay alive across the pose change — only the capture
  // session inside PoseCaptureStep resets (no black "starting camera"
  // gap between poses).
  return (
    <section className="view">
      <h2 className="step-title">
        <span className="step-eyebrow">
          {step === 'front' ? 'Pose 1 of 2' : 'Pose 2 of 2'}
        </span>
        {step === 'front' ? 'Face the camera' : 'Turn sideways'}
      </h2>
      <PoseCaptureStep
        mode={step === 'front' ? 'front' : 'side'}
        instruction={
          step === 'front'
            ? 'Face the camera, whole body visible'
            : 'Turn sideways to the camera'
        }
        onCaptured={(capture) => {
          if (step === 'front') {
            frontRef.current = capture
            announce(
              'Front pose captured. Now turn ninety degrees to your side and hold still.',
            )
            setStep('side')
            return
          }
          const front = frontRef.current
          if (!front || heightCm === null) return
          announce('Side pose captured. All done — your results are ready.')
          onComplete({ heightCm, front, side: capture })
        }}
      />
    </section>
  )
}
