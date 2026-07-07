import { describe, expect, it } from 'vitest'
import {
  extractTorsoWidthProfile,
  extractWidthProfile,
  medianProfile,
  type TorsoBand,
} from './silhouette'

describe('extractWidthProfile', () => {
  it('measures the mask extent per row', () => {
    // 6x4 mask: row 0 empty, row 1 cols 1-3, row 2 cols 0-5, row 3 col 2
    const w = 6
    const mask = new Float32Array(w * 4)
    for (let c = 1; c <= 3; c++) mask[w * 1 + c] = 1
    for (let c = 0; c <= 5; c++) mask[w * 2 + c] = 1
    mask[w * 3 + 2] = 1
    expect(extractWidthProfile(mask, w, 4)).toEqual([0, 3, 6, 1])
  })

  it('measures extent, not filled pixels (holes ignored)', () => {
    const w = 5
    const mask = new Float32Array(w)
    mask[0] = 1
    mask[4] = 1 // gap in between
    expect(extractWidthProfile(mask, w, 1)).toEqual([5])
  })
})

describe('extractTorsoWidthProfile', () => {
  // 40-wide, 10-tall mask. Torso occupies cols 15–25 (width 11).
  // Arms occupy cols 4–8 and 32–36 (well outside the torso) on the
  // same rows — the full-extent scan would read ~33, the torso scan 11.
  const W = 40
  const H = 10
  const mask = new Float32Array(W * H)
  for (let row = 2; row <= 7; row++) {
    for (let c = 15; c <= 25; c++) mask[row * W + c] = 1 // torso
    for (let c = 4; c <= 8; c++) mask[row * W + c] = 1 // left arm
    for (let c = 32; c <= 36; c++) mask[row * W + c] = 1 // right arm
  }

  const band: TorsoBand = {
    shoulderRowPx: 2,
    hipRowPx: 7,
    shoulderXMinPx: 16,
    shoulderXMaxPx: 24,
    hipXMinPx: 16,
    hipXMaxPx: 24,
  }

  it('excludes the arms, measuring only the torso width', () => {
    const full = extractWidthProfile(mask, W, H)
    const torso = extractTorsoWidthProfile(mask, W, H, band)
    expect(full[4]).toBe(33) // col 4 → col 36
    expect(torso[4]).toBe(11) // cols 15–25 only
  })

  it('keeps the torso edge via the margin', () => {
    // band 16–24 + 12% margin (~1px) still captures the 15–25 torso
    const torso = extractTorsoWidthProfile(mask, W, H, band)
    expect(torso[4]).toBeGreaterThanOrEqual(11)
    expect(torso[4]).toBeLessThan(20) // nowhere near the arm-inclusive 33
  })
})

describe('medianProfile', () => {
  it('takes the per-row median across profiles', () => {
    const result = medianProfile([
      [10, 0],
      [12, 4],
      [11, 2],
    ])
    expect(result).toEqual([11, 2])
  })

  it('handles empty input', () => {
    expect(medianProfile([])).toEqual([])
  })
})
