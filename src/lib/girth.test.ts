import { describe, expect, it } from 'vitest'
import {
  ellipseCircumference,
  estimateCircumferences,
  findSectionRows,
  SECTION_CORRECTION,
  type CaptureGirthData,
} from './girth'

describe('ellipseCircumference', () => {
  it('matches the circle formula when a = b', () => {
    expect(ellipseCircumference(10, 10)).toBeCloseTo(2 * Math.PI * 10, 6)
  })

  it('approximates a known ellipse (a=15, b=10) well', () => {
    // reference perimeter ≈ 79.0 (exact elliptic integral ≈ 79.06)
    expect(ellipseCircumference(15, 10)).toBeGreaterThan(78.5)
    expect(ellipseCircumference(15, 10)).toBeLessThan(79.5)
  })
})

/** Torso-like profile: wide at chest, narrow at waist, widest at hips. */
function torsoProfile(length = 100): number[] {
  const profile = new Array<number>(length).fill(0)
  for (let r = 10; r < 90; r++) {
    if (r < 35)
      profile[r] = 300 // chest region
    else if (r < 55)
      profile[r] = 260 // waist region (narrow)
    else profile[r] = 320 // hip region (widest)
  }
  return profile
}

function frontData(): CaptureGirthData {
  return {
    profile: torsoProfile(),
    shoulderRowPx: 15,
    hipRowPx: 60,
    cmPerPixel: 0.1,
  }
}

function sideData(): CaptureGirthData {
  const profile = new Array<number>(100).fill(0)
  for (let r = 10; r < 90; r++) profile[r] = 200 // 20 cm depth everywhere
  return { profile, shoulderRowPx: 20, hipRowPx: 65, cmPerPixel: 0.1 }
}

describe('findSectionRows', () => {
  it('finds chest at the fixed fraction, waist at the narrowest row, hip at the widest', () => {
    const rows = findSectionRows(frontData())
    expect(rows).not.toBeNull()
    // chest: 15 + 0.22*45 ≈ 25
    expect(rows?.chestRow).toBe(25)
    // waist: narrowest smoothed row in (25, 60) → inside the 260 band
    expect(rows?.waistRow).toBeGreaterThanOrEqual(35)
    expect(rows?.waistRow).toBeLessThan(55)
    // hip: widest around the hip line → inside the 320 band
    expect(rows?.hipRow).toBeGreaterThanOrEqual(55)
  })

  it('rejects a degenerate torso', () => {
    const data = frontData()
    data.hipRowPx = data.shoulderRowPx
    expect(findSectionRows(data)).toBeNull()
  })
})

describe('estimateCircumferences', () => {
  it('computes ellipse circumferences from front width and side depth', () => {
    const result = estimateCircumferences(frontData(), sideData())
    expect(result).not.toBeNull()
    if (!result) return
    // chest: a = 15 cm, b = 10 cm → ≈79.06 * 0.97 ≈ 76.7
    expect(result.chestCm).toBeCloseTo(
      ellipseCircumference(15, 10) * SECTION_CORRECTION.chestCm,
      1,
    )
    // waist narrower than chest, hip widest
    expect(result.waistCm).toBeLessThan(result.chestCm)
    expect(result.hipCm).toBeGreaterThan(result.chestCm)
  })

  it('returns null when a profile is empty at a section', () => {
    const side = sideData()
    side.profile = new Array<number>(100).fill(0)
    expect(estimateCircumferences(frontData(), side)).toBeNull()
  })
})
