import { useMemo, useState } from 'react'
import type { CaptureResult } from '../lib/captureSession'
import { computeCmPerPixel } from '../lib/calibration'
import { measureFrame, type Measurements } from '../lib/measurements'
import {
  estimateCircumferences,
  girthDataFromCapture,
  GIRTH_UNCERTAINTY_FRACTION,
} from '../lib/girth'
import {
  confidenceLabel,
  summarizeRange,
  type RangeSummary,
} from '../lib/stats'
import { cmToInches } from '../lib/units'

interface ResultsViewProps {
  capture: CaptureResult | null
  onRestart: () => void
}

function formatRange(summary: RangeSummary, unit: 'cm' | 'in'): string {
  const convert = unit === 'cm' ? (v: number) => v : cmToInches
  const digits = unit === 'cm' ? 0 : 1
  const low = convert(summary.low).toFixed(digits)
  const high = convert(summary.high).toFixed(digits)
  if (low === high) return `≈${low} ${unit}`
  return `${low}–${high} ${unit}`
}

function computeRanges(capture: CaptureResult) {
  const samples: Measurements[] = []
  for (const frame of capture.front.frames) {
    const cmPerPixel = computeCmPerPixel(
      frame,
      capture.heightCm,
      capture.front.dims.height,
    )
    if (cmPerPixel === null) continue
    const sample = measureFrame(
      frame,
      capture.front.dims,
      cmPerPixel,
      capture.heightCm,
    )
    if (sample) samples.push(sample)
  }
  if (samples.length === 0) return null
  return {
    'Shoulder width': summarizeRange(samples.map((s) => s.shoulderWidthCm)),
    'Arm length': summarizeRange(samples.map((s) => s.armLengthCm)),
    Inseam: summarizeRange(samples.map((s) => s.inseamCm)),
    'Torso length': summarizeRange(samples.map((s) => s.torsoLengthCm)),
  }
}

/** Circumference ranges with the deliberately wider girth uncertainty. */
function computeGirthRanges(
  capture: CaptureResult,
): Record<string, RangeSummary> | null {
  const front = girthDataFromCapture(capture.front, capture.heightCm)
  const side = girthDataFromCapture(capture.side, capture.heightCm)
  if (!front || !side) return null
  const girth = estimateCircumferences(front, side)
  if (!girth) return null
  const widen = (value: number): RangeSummary => ({
    median: value,
    low: value * (1 - GIRTH_UNCERTAINTY_FRACTION),
    high: value * (1 + GIRTH_UNCERTAINTY_FRACTION),
  })
  return {
    Chest: widen(girth.chestCm),
    Waist: widen(girth.waistCm),
    Hips: widen(girth.hipCm),
  }
}

export function ResultsView({ capture, onRestart }: ResultsViewProps) {
  const [unit, setUnit] = useState<'cm' | 'in'>('cm')
  const ranges = useMemo(
    () => (capture ? computeRanges(capture) : null),
    [capture],
  )
  const girthRanges = useMemo(
    () => (capture ? computeGirthRanges(capture) : null),
    [capture],
  )

  if (!capture || !ranges) {
    return (
      <section className="view">
        <p>No capture data — run a measurement first.</p>
        <button type="button" className="primary" onClick={onRestart}>
          Start measuring
        </button>
      </section>
    )
  }

  return (
    <section className="view">
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
            {Object.entries(ranges).map(([label, summary]) => (
              <tr key={label}>
                <td>{label}</td>
                <td>{formatRange(summary, unit)}</td>
                <td className={`confidence-${confidenceLabel(summary)}`}>
                  {confidenceLabel(summary)} confidence
                </td>
              </tr>
            ))}
            {girthRanges &&
              Object.entries(girthRanges).map(([label, summary]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{formatRange(summary, unit)}</td>
                  <td className="confidence-low">estimate</td>
                </tr>
              ))}
          </tbody>
        </table>
        {!girthRanges && (
          <p className="disclaimer">
            Chest, waist and hips could not be estimated from this capture — the
            body silhouette was unclear. Try again with a plain background and
            even light.
          </p>
        )}
        <p className="disclaimer">
          Estimates from camera pose tracking — ranges show the measurement
          spread, not tailor-grade accuracy. Chest/waist/hips carry the widest
          uncertainty.
        </p>
        <button type="button" className="primary" onClick={onRestart}>
          Measure again
        </button>
      </div>
    </section>
  )
}
