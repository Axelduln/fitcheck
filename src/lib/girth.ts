/**
 * Circumference estimation: each torso cross-section is modeled as an
 * ellipse with semi-axes from the front-view width (2a) and side-view
 * depth (2b) of the segmentation silhouette at that height.
 */
import { computeCmPerPixel } from './calibration'
import { median } from './stats'
import type { CapturedPose } from './captureSession'

export interface CaptureGirthData {
  /** Median mask width in px per pixel row (see silhouette.ts). */
  profile: number[]
  /** Shoulder line row (px) from the capture's landmarks. */
  shoulderRowPx: number
  /** Hip line row (px) from the capture's landmarks. */
  hipRowPx: number
  cmPerPixel: number
}

export interface Circumferences {
  chestCm: number
  waistCm: number
  hipCm: number
}

/**
 * Chest level as a fraction of the shoulder→hip distance below the
 * shoulder line (roughly armpit/nipple height). Tunable.
 */
export const CHEST_FRACTION = 0.22

/** Hip search window below the hip-joint line, as torso fractions. */
const HIP_SEARCH_START = -0.05
const HIP_SEARCH_END = 0.35

/**
 * Human torso cross-sections are not true ellipses; published fits of
 * elliptical models to 3D-scan cross-sections put the ellipse
 * perimeter within a few percent of the true girth (see e.g. CAESAR /
 * 3D anthropometry modeling literature). Starting factor 0.97 per
 * section — MUST be tuned against tape measurements (ACCURACY.md);
 * n=0 so far.
 */
export const SECTION_CORRECTION: Record<keyof Circumferences, number> = {
  chestCm: 0.97,
  waistCm: 0.97,
  hipCm: 0.97,
}

/**
 * Displayed uncertainty: circumference estimates are inherently less
 * certain than length measurements, so the UI widens the range by this
 * fraction on each side. Tunable.
 */
export const GIRTH_UNCERTAINTY_FRACTION = 0.06

/** Ramanujan's approximation of an ellipse perimeter. */
export function ellipseCircumference(a: number, b: number): number {
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)))
}

/** Width at a row, smoothed over ±2 rows to damp mask edge noise. */
function smoothedWidth(profile: number[], row: number): number {
  let sum = 0
  let count = 0
  for (let r = row - 2; r <= row + 2; r++) {
    const value = profile[r]
    if (value !== undefined && value > 0) {
      sum += value
      count++
    }
  }
  return count > 0 ? sum / count : 0
}

interface SectionRows {
  chestRow: number
  waistRow: number
  hipRow: number
}

/**
 * Locate chest/waist/hip rows in a front profile: chest at a fixed
 * fraction below the shoulders, waist as the narrowest row between
 * chest and hips, hip as the widest row around the hip-joint line.
 */
export function findSectionRows(front: CaptureGirthData): SectionRows | null {
  const torso = front.hipRowPx - front.shoulderRowPx
  if (torso <= 0) return null
  const chestRow = Math.round(front.shoulderRowPx + CHEST_FRACTION * torso)

  let waistRow = -1
  let minWidth = Infinity
  for (let r = chestRow + 1; r < front.hipRowPx; r++) {
    const w = smoothedWidth(front.profile, r)
    if (w > 0 && w < minWidth) {
      minWidth = w
      waistRow = r
    }
  }

  let hipRow = -1
  let maxWidth = 0
  const hipStart = Math.round(front.hipRowPx + HIP_SEARCH_START * torso)
  const hipEnd = Math.round(front.hipRowPx + HIP_SEARCH_END * torso)
  for (let r = hipStart; r <= hipEnd; r++) {
    const w = smoothedWidth(front.profile, r)
    if (w > maxWidth) {
      maxWidth = w
      hipRow = r
    }
  }

  if (waistRow < 0 || hipRow < 0) return null
  return { chestRow, waistRow, hipRow }
}

/** Map a front row to the equivalent side row via the torso fraction. */
function toSideRow(
  row: number,
  front: CaptureGirthData,
  side: CaptureGirthData,
): number {
  const frontTorso = front.hipRowPx - front.shoulderRowPx
  const fraction = (row - front.shoulderRowPx) / frontTorso
  return Math.round(
    side.shoulderRowPx + fraction * (side.hipRowPx - side.shoulderRowPx),
  )
}

export function estimateCircumferences(
  front: CaptureGirthData,
  side: CaptureGirthData,
): Circumferences | null {
  const rows = findSectionRows(front)
  if (!rows) return null
  if (side.hipRowPx - side.shoulderRowPx <= 0) return null

  const section = (
    frontRow: number,
    key: keyof Circumferences,
  ): number | null => {
    const widthCm = smoothedWidth(front.profile, frontRow) * front.cmPerPixel
    const depthCm =
      smoothedWidth(side.profile, toSideRow(frontRow, front, side)) *
      side.cmPerPixel
    if (widthCm <= 0 || depthCm <= 0) return null
    const a = widthCm / 2
    const b = depthCm / 2
    return ellipseCircumference(a, b) * SECTION_CORRECTION[key]
  }

  const chest = section(rows.chestRow, 'chestCm')
  const waist = section(rows.waistRow, 'waistCm')
  const hip = section(rows.hipRow, 'hipCm')
  if (chest === null || waist === null || hip === null) return null
  return { chestCm: chest, waistCm: waist, hipCm: hip }
}

const LEFT_SHOULDER = 11
const RIGHT_SHOULDER = 12
const LEFT_HIP = 23
const RIGHT_HIP = 24

/**
 * Assemble girth inputs from a wizard capture: median shoulder/hip
 * rows and px→cm scale over the captured frames, plus the mask width
 * profile recorded at capture time.
 */
export function girthDataFromCapture(
  capture: CapturedPose,
  heightCm: number,
): CaptureGirthData | null {
  const profile = capture.widthProfile
  if (!profile || profile.length === 0) return null

  const shoulderRows: number[] = []
  const hipRows: number[] = []
  const scales: number[] = []
  for (const frame of capture.frames) {
    const ls = frame[LEFT_SHOULDER]
    const rs = frame[RIGHT_SHOULDER]
    const lh = frame[LEFT_HIP]
    const rh = frame[RIGHT_HIP]
    if (!ls || !rs || !lh || !rh) continue
    shoulderRows.push(((ls.y + rs.y) / 2) * capture.dims.height)
    hipRows.push(((lh.y + rh.y) / 2) * capture.dims.height)
    const scale = computeCmPerPixel(frame, heightCm, capture.dims.height)
    if (scale !== null) scales.push(scale)
  }
  if (shoulderRows.length === 0 || scales.length === 0) return null

  return {
    profile,
    shoulderRowPx: median(shoulderRows),
    hipRowPx: median(hipRows),
    cmPerPixel: median(scales),
  }
}
