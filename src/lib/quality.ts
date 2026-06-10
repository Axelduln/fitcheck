import type { NormalizedLandmark } from './pose'
import { REQUIRED_LANDMARKS, VISIBILITY_THRESHOLD } from './bodyStatus'

export type QualityIssue =
  | 'low-visibility'
  | 'too-small'
  | 'too-large'
  | 'shoulders-tilted'
  | 'out-of-frame'
  | 'not-sideways'

export interface FrameQuality {
  valid: boolean
  issues: QualityIssue[]
}

/** Spoken/displayed guidance per issue, ordered by priority. */
export const QUALITY_GUIDANCE: Record<QualityIssue, string> = {
  'out-of-frame': 'Move so your whole body is inside the frame',
  'low-visibility': 'Some body points are hidden — face the camera fully',
  'too-small': 'Step closer to the camera',
  'too-large': 'Step back from the camera',
  'shoulders-tilted': 'Level your shoulders',
  'not-sideways': 'Turn ninety degrees so the camera sees you from the side',
}

export const MIN_HEIGHT_FRACTION = 0.6
export const MAX_HEIGHT_FRACTION = 0.9
export const MAX_SHOULDER_TILT_DEG = 5
const EDGE_MARGIN = 0.02

const LEFT_SHOULDER = 11
const RIGHT_SHOULDER = 12

/**
 * A frame is measurement-grade only if: all required landmarks are
 * clearly visible and inside the frame, the person fills 60–90% of the
 * frame height, and the shoulders are level within ±5°.
 */
export function assessFrame(
  pose: NormalizedLandmark[],
  frameAspect: number, // width / height, for pixel-true angles
): FrameQuality {
  const issues: QualityIssue[] = []

  let lowVisibility = false
  let outOfFrame = false
  for (const index of REQUIRED_LANDMARKS) {
    const lm = pose[index]
    if (!lm || (lm.visibility ?? 0) < VISIBILITY_THRESHOLD) {
      lowVisibility = true
      continue
    }
    if (
      lm.x < EDGE_MARGIN ||
      lm.x > 1 - EDGE_MARGIN ||
      lm.y < EDGE_MARGIN ||
      lm.y > 1 - EDGE_MARGIN
    ) {
      outOfFrame = true
    }
  }
  if (outOfFrame) issues.push('out-of-frame')
  if (lowVisibility) issues.push('low-visibility')

  let minY = Infinity
  let maxY = -Infinity
  for (const lm of pose) {
    if (lm.y < minY) minY = lm.y
    if (lm.y > maxY) maxY = lm.y
  }
  const heightFraction = maxY - minY
  if (heightFraction < MIN_HEIGHT_FRACTION) issues.push('too-small')
  else if (heightFraction > MAX_HEIGHT_FRACTION) issues.push('too-large')

  const left = pose[LEFT_SHOULDER]
  const right = pose[RIGHT_SHOULDER]
  if (left && right) {
    const dx = Math.abs(left.x - right.x) * frameAspect
    const dy = Math.abs(left.y - right.y)
    const tiltDeg = (Math.atan2(dy, dx) * 180) / Math.PI
    if (tiltDeg > MAX_SHOULDER_TILT_DEG) issues.push('shoulders-tilted')
  }

  return { valid: issues.length === 0, issues }
}

/**
 * Sideways check: in profile the shoulders overlap horizontally, so
 * the shoulder x-gap shrinks relative to the shoulder→hip vertical
 * distance. Facing the camera the ratio is ~0.7; in profile it drops
 * well under this threshold. Tunable.
 */
export const MAX_SIDEWAYS_SHOULDER_RATIO = 0.3

const LEFT_HIP = 23
const RIGHT_HIP = 24

/**
 * Side-pose validity. Visibility is only required for shoulders/hips/
 * knees/ankles on at least one side — in profile the far side of the
 * body is occluded and may legitimately score low.
 */
export function assessSideFrame(
  pose: NormalizedLandmark[],
  frameAspect: number,
): FrameQuality {
  const issues: QualityIssue[] = []

  const pairs: Array<[number, number]> = [
    [11, 12], // shoulders
    [23, 24], // hips
    [25, 26], // knees
    [27, 28], // ankles
    [29, 30], // heels
  ]
  let lowVisibility = false
  let outOfFrame = false
  for (const [a, b] of pairs) {
    const best = [pose[a], pose[b]]
      .filter((lm): lm is NormalizedLandmark => lm !== undefined)
      .sort((l, r) => (r.visibility ?? 0) - (l.visibility ?? 0))[0]
    if (!best || (best.visibility ?? 0) < VISIBILITY_THRESHOLD) {
      lowVisibility = true
      continue
    }
    if (
      best.x < EDGE_MARGIN ||
      best.x > 1 - EDGE_MARGIN ||
      best.y < EDGE_MARGIN ||
      best.y > 1 - EDGE_MARGIN
    ) {
      outOfFrame = true
    }
  }
  if (outOfFrame) issues.push('out-of-frame')
  if (lowVisibility) issues.push('low-visibility')

  let minY = Infinity
  let maxY = -Infinity
  for (const lm of pose) {
    if (lm.y < minY) minY = lm.y
    if (lm.y > maxY) maxY = lm.y
  }
  const heightFraction = maxY - minY
  if (heightFraction < MIN_HEIGHT_FRACTION) issues.push('too-small')
  else if (heightFraction > MAX_HEIGHT_FRACTION) issues.push('too-large')

  const ls = pose[LEFT_SHOULDER]
  const rs = pose[RIGHT_SHOULDER]
  const lh = pose[LEFT_HIP]
  const rh = pose[RIGHT_HIP]
  if (ls && rs && lh && rh) {
    const shoulderGapX = Math.abs(ls.x - rs.x) * frameAspect
    const torsoHeight = Math.abs((lh.y + rh.y) / 2 - (ls.y + rs.y) / 2)
    if (
      torsoHeight > 0 &&
      shoulderGapX / torsoHeight > MAX_SIDEWAYS_SHOULDER_RATIO
    ) {
      issues.push('not-sideways')
    }
  }

  return { valid: issues.length === 0, issues }
}
