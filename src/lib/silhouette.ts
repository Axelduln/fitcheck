/**
 * Silhouette width profile: the horizontal extent (in pixels) of the
 * segmentation mask at every row. Row index = pixel row of the frame.
 */
const MASK_THRESHOLD = 0.5

export function extractWidthProfile(
  mask: Float32Array,
  width: number,
  height: number,
): number[] {
  const profile = new Array<number>(height).fill(0)
  for (let row = 0; row < height; row++) {
    const offset = row * width
    let left = -1
    let right = -1
    for (let col = 0; col < width; col++) {
      if ((mask[offset + col] ?? 0) > MASK_THRESHOLD) {
        if (left === -1) left = col
        right = col
      }
    }
    if (left !== -1) profile[row] = right - left + 1
  }
  return profile
}

/**
 * Torso x-bounds in pixels at the shoulder and hip lines, from
 * landmarks. Used to clip arms/hands out of the width scan.
 */
export interface TorsoBand {
  shoulderRowPx: number
  hipRowPx: number
  shoulderXMinPx: number
  shoulderXMaxPx: number
  hipXMinPx: number
  hipXMaxPx: number
}

/**
 * Fraction the torso bulges beyond the shoulder/hip joint centers —
 * the joints sit inside the body edge, so the band is widened by this
 * on each side. Tunable: too small clips real torso, too large lets
 * the arms back in.
 */
export const TORSO_MARGIN_FRACTION = 0.12

/**
 * Like extractWidthProfile, but each row's scan is clipped to the
 * torso column so the arms and hands don't inflate the width. The band
 * edges interpolate linearly from the shoulder line to the hip line
 * (clamped above/below), then widen by TORSO_MARGIN_FRACTION.
 *
 * This is the input to circumference estimation: without it, the full
 * silhouette measures shoulder-to-hand span, not body width, and
 * circumferences come out 30–40 cm too large (ACCURACY.md, g1).
 */
export function extractTorsoWidthProfile(
  mask: Float32Array,
  width: number,
  height: number,
  band: TorsoBand,
): number[] {
  const span = band.hipRowPx - band.shoulderRowPx
  const profile = new Array<number>(height).fill(0)
  for (let row = 0; row < height; row++) {
    const t = span > 0 ? clamp01((row - band.shoulderRowPx) / span) : 0
    let bandMin = lerp(band.shoulderXMinPx, band.hipXMinPx, t)
    let bandMax = lerp(band.shoulderXMaxPx, band.hipXMaxPx, t)
    const margin = (bandMax - bandMin) * TORSO_MARGIN_FRACTION
    bandMin = Math.max(0, Math.floor(bandMin - margin))
    bandMax = Math.min(width - 1, Math.ceil(bandMax + margin))
    if (bandMax <= bandMin) continue

    const offset = row * width
    let left = -1
    let right = -1
    for (let col = bandMin; col <= bandMax; col++) {
      if ((mask[offset + col] ?? 0) > MASK_THRESHOLD) {
        if (left === -1) left = col
        right = col
      }
    }
    if (left !== -1) profile[row] = right - left + 1
  }
  return profile
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Per-row median across several profiles (robust against mask flicker). */
export function medianProfile(profiles: number[][]): number[] {
  const first = profiles[0]
  if (!first) return []
  const height = first.length
  const result = new Array<number>(height).fill(0)
  for (let row = 0; row < height; row++) {
    const values = profiles.map((p) => p[row] ?? 0).sort((a, b) => a - b)
    const mid = Math.floor(values.length / 2)
    result[row] =
      values.length % 2 === 1
        ? (values[mid] ?? 0)
        : ((values[mid - 1] ?? 0) + (values[mid] ?? 0)) / 2
  }
  return result
}
