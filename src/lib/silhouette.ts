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
