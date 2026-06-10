import { useCallback, useRef, useState } from 'react'
import { CameraView } from './CameraView'
import type { NormalizedLandmark } from '../lib/pose'
import { computeCmPerPixel } from '../lib/calibration'
import {
  measureFrame,
  type FrameDims,
  type Measurements,
} from '../lib/measurements'
import { assessFrame, QUALITY_GUIDANCE } from '../lib/quality'
import {
  confidenceLabel,
  summarizeRange,
  type RangeSummary,
} from '../lib/stats'
import { cmToInches } from '../lib/units'
import { VoiceAnnouncer } from '../lib/speech'

/** ~2 s of valid pose at the target 15+ FPS. Tunable. */
const FRAMES_NEEDED = 30

interface ResultRanges {
  shoulderWidth: RangeSummary
  armLength: RangeSummary
  inseam: RangeSummary
  torsoLength: RangeSummary
}

interface CaptureViewProps {
  onDone: () => void
}

function formatRange(summary: RangeSummary, unit: 'cm' | 'in'): string {
  const convert = unit === 'cm' ? (v: number) => v : cmToInches
  const digits = unit === 'cm' ? 0 : 1
  const low = convert(summary.low).toFixed(digits)
  const high = convert(summary.high).toFixed(digits)
  if (low === high) return `≈${low} ${unit}`
  return `${low}–${high} ${unit}`
}

export function CaptureView({ onDone }: CaptureViewProps) {
  const [heightInput, setHeightInput] = useState('')
  const [heightCm, setHeightCm] = useState<number | null>(null)
  const [heightError, setHeightError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [guidance, setGuidance] = useState<string | null>(null)
  const [result, setResult] = useState<ResultRanges | null>(null)
  const [unit, setUnit] = useState<'cm' | 'in'>('cm')

  const samplesRef = useRef<Measurements[]>([])
  const doneRef = useRef(false)
  const announcerRef = useRef<VoiceAnnouncer | null>(null)

  const onFrame = useCallback(
    (pose: NormalizedLandmark[] | null, dims: FrameDims, nowMs: number) => {
      if (heightCm === null || doneRef.current || !pose) return
      announcerRef.current ??= new VoiceAnnouncer()
      const announcer = announcerRef.current

      const quality = assessFrame(pose, dims.width / dims.height)
      if (!quality.valid) {
        const issue = quality.issues[0]
        if (issue) {
          setGuidance(QUALITY_GUIDANCE[issue])
          announcer.speak(QUALITY_GUIDANCE[issue], nowMs)
        }
        return
      }
      setGuidance(null)

      const cmPerPixel = computeCmPerPixel(pose, heightCm, dims.height)
      if (cmPerPixel === null) return
      const sample = measureFrame(pose, dims, cmPerPixel, heightCm)
      if (!sample) return

      samplesRef.current.push(sample)
      setProgress(samplesRef.current.length)

      if (samplesRef.current.length >= FRAMES_NEEDED) {
        doneRef.current = true
        const samples = samplesRef.current
        setResult({
          shoulderWidth: summarizeRange(samples.map((s) => s.shoulderWidthCm)),
          armLength: summarizeRange(samples.map((s) => s.armLengthCm)),
          inseam: summarizeRange(samples.map((s) => s.inseamCm)),
          torsoLength: summarizeRange(samples.map((s) => s.torsoLengthCm)),
        })
        announcer.speak(
          'Measurements complete. Check the screen for your results.',
          nowMs,
          { force: true },
        )
      }
    },
    [heightCm],
  )

  const restart = () => {
    samplesRef.current = []
    doneRef.current = false
    setProgress(0)
    setResult(null)
    setGuidance(null)
  }

  if (heightCm === null) {
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

  const rows: Array<[string, RangeSummary]> = result
    ? [
        ['Shoulder width', result.shoulderWidth],
        ['Arm length', result.armLength],
        ['Inseam', result.inseam],
        ['Torso length', result.torsoLength],
      ]
    : []

  return (
    <section className="view">
      <CameraView onFrame={onFrame} />
      {!result && (
        <p className="measure-status">
          {guidance ??
            (progress > 0
              ? `Hold still — measuring… ${progress}/${FRAMES_NEEDED}`
              : 'Stand 2–3 m away, full body in frame')}
        </p>
      )}
      {result && (
        <div className="results">
          <div className="results-header">
            <h2>Your measurements</h2>
            <button
              type="button"
              className="debug-toggle"
              onClick={() => setUnit(unit === 'cm' ? 'in' : 'cm')}
            >
              Show {unit === 'cm' ? 'inches' : 'cm'}
            </button>
          </div>
          <table className="results-table">
            <tbody>
              {rows.map(([label, summary]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{formatRange(summary, unit)}</td>
                  <td className={`confidence-${confidenceLabel(summary)}`}>
                    {confidenceLabel(summary)} confidence
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="disclaimer">
            Estimates from camera pose tracking — ranges show the measurement
            spread, not tailor-grade accuracy.
          </p>
          <div className="camera-controls">
            <button type="button" className="primary" onClick={restart}>
              Measure again
            </button>
            <button type="button" className="primary" onClick={onDone}>
              Continue
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
