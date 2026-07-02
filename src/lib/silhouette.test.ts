import { describe, expect, it } from 'vitest'
import { extractWidthProfile, medianProfile } from './silhouette'

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
