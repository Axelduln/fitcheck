import type { NormalizedLandmark } from './pose'

export interface FrameDims {
  width: number
  height: number
}

export interface Measurements {
  shoulderWidthCm: number
  armLengthCm: number
  inseamCm: number
  torsoLengthCm: number
}

/**
 * Landmarks 11/12 sit at the gleno-humeral joint centers, ~2.5 cm
 * inside the outer shoulder (acromion + deltoid) on each side, so
 * garment shoulder width adds a fixed offset. Tunable; starting value
 * from comparing biacromial vs. bideltoid breadth in anthropometric
 * tables (Tilley, "The Measure of Man and Woman").
 */
export const SHOULDER_OFFSET_CM = 5

/**
 * The hip landmarks sit at the hip joint (≈ trochanter height, 0.530 ×
 * stature) while the inseam starts at the crotch (≈ 0.485 × stature) —
 * a gap of ~4.5% of stature. Segment proportions from Drillis &
 * Contini (1966). Tunable. Validated against a real tape measurement
 * on 2026-06-10 (see ACCURACY.md).
 */
export const CROTCH_OFFSET_STATURE_FRACTION = 0.045

const LEFT_SHOULDER = 11
const RIGHT_SHOULDER = 12
const LEFT_ELBOW = 13
const RIGHT_ELBOW = 14
const LEFT_WRIST = 15
const RIGHT_WRIST = 16
const LEFT_HIP = 23
const RIGHT_HIP = 24
const LEFT_HEEL = 29
const RIGHT_HEEL = 30

interface PixelPoint {
  x: number
  y: number
}

function toPixels(
  landmark: NormalizedLandmark | undefined,
  dims: FrameDims,
): PixelPoint | null {
  if (!landmark) return null
  return { x: landmark.x * dims.width, y: landmark.y * dims.height }
}

function dist(a: PixelPoint, b: PixelPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function mid(a: PixelPoint, b: PixelPoint): PixelPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** Garment shoulder width: joint-center distance plus deltoid offset. */
export function shoulderWidthCm(
  pose: NormalizedLandmark[],
  dims: FrameDims,
  cmPerPixel: number,
): number | null {
  const left = toPixels(pose[LEFT_SHOULDER], dims)
  const right = toPixels(pose[RIGHT_SHOULDER], dims)
  if (!left || !right) return null
  return dist(left, right) * cmPerPixel + SHOULDER_OFFSET_CM
}

/** Shoulder→elbow→wrist, averaged over both arms. */
export function armLengthCm(
  pose: NormalizedLandmark[],
  dims: FrameDims,
  cmPerPixel: number,
): number | null {
  const sides: Array<[number, number, number]> = [
    [LEFT_SHOULDER, LEFT_ELBOW, LEFT_WRIST],
    [RIGHT_SHOULDER, RIGHT_ELBOW, RIGHT_WRIST],
  ]
  const lengths: number[] = []
  for (const [s, e, w] of sides) {
    const shoulder = toPixels(pose[s], dims)
    const elbow = toPixels(pose[e], dims)
    const wrist = toPixels(pose[w], dims)
    if (!shoulder || !elbow || !wrist) continue
    lengths.push((dist(shoulder, elbow) + dist(elbow, wrist)) * cmPerPixel)
  }
  if (lengths.length === 0) return null
  return lengths.reduce((a, b) => a + b, 0) / lengths.length
}

/**
 * Inseam in the garment convention: crotch to floor. The crotch sits
 * CROTCH_OFFSET_STATURE_FRACTION of stature below the hip-joint
 * landmarks; the heels stand on the floor. Vertical distance is used —
 * valid because quality.ts only passes upright standing frames.
 * (A hip→knee→ankle path was tried first and read ~11 cm short of a
 * tape measurement: the ankle bone sits ~4% of stature above the
 * floor. See ACCURACY.md, 2026-06-10.)
 */
export function inseamCm(
  pose: NormalizedLandmark[],
  dims: FrameDims,
  cmPerPixel: number,
  heightCm: number,
): number | null {
  const lh = toPixels(pose[LEFT_HIP], dims)
  const rh = toPixels(pose[RIGHT_HIP], dims)
  const lheel = toPixels(pose[LEFT_HEEL], dims)
  const rheel = toPixels(pose[RIGHT_HEEL], dims)
  if (!lh || !rh || !lheel || !rheel) return null
  const hipToFloor = (mid(lheel, rheel).y - mid(lh, rh).y) * cmPerPixel
  if (hipToFloor <= 0) return null
  return hipToFloor - CROTCH_OFFSET_STATURE_FRACTION * heightCm
}

/** Shoulder midpoint to hip midpoint. */
export function torsoLengthCm(
  pose: NormalizedLandmark[],
  dims: FrameDims,
  cmPerPixel: number,
): number | null {
  const ls = toPixels(pose[LEFT_SHOULDER], dims)
  const rs = toPixels(pose[RIGHT_SHOULDER], dims)
  const lh = toPixels(pose[LEFT_HIP], dims)
  const rh = toPixels(pose[RIGHT_HIP], dims)
  if (!ls || !rs || !lh || !rh) return null
  return dist(mid(ls, rs), mid(lh, rh)) * cmPerPixel
}

/** All length measurements for one frame; null if any landmark is missing. */
export function measureFrame(
  pose: NormalizedLandmark[],
  dims: FrameDims,
  cmPerPixel: number,
  heightCm: number,
): Measurements | null {
  const shoulder = shoulderWidthCm(pose, dims, cmPerPixel)
  const arm = armLengthCm(pose, dims, cmPerPixel)
  const inseam = inseamCm(pose, dims, cmPerPixel, heightCm)
  const torso = torsoLengthCm(pose, dims, cmPerPixel)
  if (shoulder === null || arm === null || inseam === null || torso === null) {
    return null
  }
  return {
    shoulderWidthCm: shoulder,
    armLengthCm: arm,
    inseamCm: inseam,
    torsoLengthCm: torso,
  }
}
