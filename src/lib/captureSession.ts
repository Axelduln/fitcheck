import type { NormalizedLandmark } from './pose'
import type { FrameDims } from './measurements'

/** Seconds of continuous valid pose before auto-capture (spec: ≥2 s). */
export const COUNTDOWN_SECONDS = 3
/** Valid frames kept for the captured sample (median basis). */
export const CAPTURE_BUFFER_FRAMES = 30

export interface CapturedPose {
  /** The last valid landmark frames leading up to the capture moment. */
  frames: NormalizedLandmark[][]
  dims: FrameDims
}

export interface CaptureResult {
  heightCm: number
  front: CapturedPose
  side: CapturedPose
}

export type CaptureEvent =
  | { type: 'countdown'; secondsLeft: number }
  | { type: 'reset' }
  | { type: 'captured'; frames: NormalizedLandmark[][] }

/**
 * Auto-capture state machine: once the pose is continuously valid, a
 * spoken countdown runs; any invalid frame resets it. After
 * COUNTDOWN_SECONDS the buffered valid frames are emitted as the
 * capture. Pure (caller supplies timestamps) and unit-testable.
 */
export class CaptureCountdown {
  private validSinceMs: number | null = null
  private lastAnnouncedSecond: number | null = null
  private buffer: NormalizedLandmark[][] = []
  private done = false

  /** Feed one assessed frame; returns an event when something changes. */
  tick(
    valid: boolean,
    pose: NormalizedLandmark[] | null,
    nowMs: number,
  ): CaptureEvent | null {
    if (this.done) return null

    if (!valid || !pose) {
      const wasCounting = this.validSinceMs !== null
      this.validSinceMs = null
      this.lastAnnouncedSecond = null
      this.buffer = []
      return wasCounting ? { type: 'reset' } : null
    }

    this.buffer.push(pose)
    if (this.buffer.length > CAPTURE_BUFFER_FRAMES) this.buffer.shift()

    this.validSinceMs ??= nowMs
    const elapsedMs = nowMs - this.validSinceMs
    const secondsLeft = COUNTDOWN_SECONDS - Math.floor(elapsedMs / 1000)

    if (secondsLeft <= 0) {
      this.done = true
      return { type: 'captured', frames: this.buffer }
    }
    if (secondsLeft !== this.lastAnnouncedSecond) {
      this.lastAnnouncedSecond = secondsLeft
      return { type: 'countdown', secondsLeft }
    }
    return null
  }
}
