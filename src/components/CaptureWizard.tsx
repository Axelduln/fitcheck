import { useRef, useState } from 'react'
import { PoseCaptureStep } from './PoseCaptureStep'
import type { CapturedPose, CaptureResult } from '../lib/captureSession'
import { VoiceAnnouncer } from '../lib/speech'

type WizardStep = 'instructions' | 'height' | 'front' | 'side'

interface CaptureWizardProps {
  onComplete: (result: CaptureResult) => void
}

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
      <section className="view">
        <h2 className="step-title">
          <span className="step-eyebrow">Setup</span>
          Before you start
        </h2>
        <ul className="instructions-list">
          <li>Wear fitted clothing — baggy clothes hide your shape.</li>
          <li>Stand in front of a plain background, evenly lit.</li>
          <li>Prop the device upright, roughly hip height.</li>
          <li>You will stand about 3 meters away.</li>
          <li>
            The app speaks all guidance out loud — you don't need to read the
            screen while posing.
          </li>
          <li>Two poses are captured: facing the camera, then sideways.</li>
        </ul>
        <button
          type="button"
          className="primary"
          onClick={() => setStep('height')}
        >
          I'm ready
        </button>
      </section>
    )
  }

  if (step === 'height') {
    return (
      <section className="view">
        <p>
          Enter your body height — it calibrates the camera so pixel distances
          become centimeters.
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
