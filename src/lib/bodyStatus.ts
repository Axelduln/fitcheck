import type { NormalizedLandmark } from './pose'

export type BodyStatus = 'none' | 'partial' | 'full'

/**
 * Landmarks that must be clearly visible before measurements are
 * possible: nose, shoulders, hips, knees, ankles.
 */
export const REQUIRED_LANDMARKS = [0, 11, 12, 23, 24, 25, 26, 27, 28] as const

export const VISIBILITY_THRESHOLD = 0.7

export function computeBodyStatus(
  pose: NormalizedLandmark[] | null,
): BodyStatus {
  if (!pose || pose.length === 0) return 'none'
  for (const index of REQUIRED_LANDMARKS) {
    const landmark = pose[index]
    if (!landmark || (landmark.visibility ?? 0) < VISIBILITY_THRESHOLD) {
      return 'partial'
    }
  }
  return 'full'
}

const STABLE_MS = 800

/**
 * Suppresses frame-to-frame flicker: a status must hold for STABLE_MS
 * before it is reported as a change.
 */
export class StatusDebouncer {
  private candidate: BodyStatus | null = null
  private candidateSince = 0
  private current: BodyStatus | null = null

  /** Feed the raw per-frame status; returns the new status once stable. */
  tick(status: BodyStatus, nowMs: number): BodyStatus | null {
    if (status === this.current) {
      this.candidate = null
      return null
    }
    if (status !== this.candidate) {
      this.candidate = status
      this.candidateSince = nowMs
      return null
    }
    if (nowMs - this.candidateSince >= STABLE_MS) {
      this.current = status
      this.candidate = null
      return status
    }
    return null
  }
}
