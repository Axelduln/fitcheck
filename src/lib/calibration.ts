import type { NormalizedLandmark } from './pose'

/**
 * The vertex (top of head) is not a MediaPipe landmark, so person pixel
 * height is measured from the eye line to the heels and extrapolated:
 * anthropometric tables put the eye line ~6.4% of stature below the
 * vertex (eye-to-vertex ≈ 11.2 cm at 175 cm stature; Tilley, "The
 * Measure of Man and Woman"). Tunable.
 */
export const EYE_TO_VERTEX_STATURE_FRACTION = 0.064

const LEFT_EYE = 2
const RIGHT_EYE = 5
const LEFT_HEEL = 29
const RIGHT_HEEL = 30

/**
 * Pixel→cm scale factor from a validated front-pose frame of a person
 * standing upright with known body height.
 *
 * Assumes: the person stands straight (no crouch), heels on the ground,
 * and the camera roughly level — all enforced by quality.ts before a
 * frame reaches this function.
 */
export function computeCmPerPixel(
  pose: NormalizedLandmark[],
  heightCm: number,
  frameHeightPx: number,
): number | null {
  const leftEye = pose[LEFT_EYE]
  const rightEye = pose[RIGHT_EYE]
  const leftHeel = pose[LEFT_HEEL]
  const rightHeel = pose[RIGHT_HEEL]
  if (!leftEye || !rightEye || !leftHeel || !rightHeel) return null
  if (heightCm <= 0 || frameHeightPx <= 0) return null

  const eyeY = ((leftEye.y + rightEye.y) / 2) * frameHeightPx
  const heelY = ((leftHeel.y + rightHeel.y) / 2) * frameHeightPx
  const eyeToHeelPx = heelY - eyeY
  if (eyeToHeelPx <= 0) return null

  const fullHeightPx = eyeToHeelPx / (1 - EYE_TO_VERTEX_STATURE_FRACTION)
  return heightCm / fullHeightPx
}
