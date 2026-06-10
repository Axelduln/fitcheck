import { describe, expect, it } from 'vitest'
import {
  armLengthCm,
  CROTCH_OFFSET_STATURE_FRACTION,
  inseamCm,
  measureFrame,
  SHOULDER_OFFSET_CM,
  shoulderWidthCm,
  torsoLengthCm,
} from './measurements'
import { syntheticStandingPose } from '../test/syntheticPose'

const DIMS = { width: 1000, height: 1000 }
const SCALE = 0.225 // cm per pixel
const HEIGHT_CM = 180

describe('shoulderWidthCm', () => {
  it('converts joint distance and adds the deltoid offset', () => {
    const pose = syntheticStandingPose()
    // shoulders at x=0.42/0.58 → 160 px apart
    expect(shoulderWidthCm(pose, DIMS, SCALE)).toBeCloseTo(
      160 * SCALE + SHOULDER_OFFSET_CM,
      4,
    )
  })
})

describe('armLengthCm', () => {
  it('sums shoulder→elbow→wrist segments, averaged over both arms', () => {
    const pose = syntheticStandingPose()
    // left arm: (420,300)→(400,450)→(390,580); symmetric on the right
    const upper = Math.hypot(20, 150)
    const lower = Math.hypot(10, 130)
    expect(armLengthCm(pose, DIMS, SCALE)).toBeCloseTo(
      (upper + lower) * SCALE,
      4,
    )
  })
})

describe('inseamCm', () => {
  it('subtracts the crotch offset from the leg path', () => {
    const pose = syntheticStandingPose()
    // left leg: (460,520)→(455,700)→(450,880); symmetric on the right
    const thigh = Math.hypot(5, 180)
    const shin = Math.hypot(5, 180)
    const expected =
      (thigh + shin) * SCALE - CROTCH_OFFSET_STATURE_FRACTION * HEIGHT_CM
    expect(inseamCm(pose, DIMS, SCALE, HEIGHT_CM)).toBeCloseTo(expected, 4)
  })
})

describe('torsoLengthCm', () => {
  it('measures shoulder midpoint to hip midpoint', () => {
    const pose = syntheticStandingPose()
    // shoulder mid (500,300), hip mid (500,520) → 220 px
    expect(torsoLengthCm(pose, DIMS, SCALE)).toBeCloseTo(220 * SCALE, 4)
  })
})

describe('measureFrame', () => {
  it('returns all four measurements for a complete pose', () => {
    const result = measureFrame(syntheticStandingPose(), DIMS, SCALE, HEIGHT_CM)
    expect(result).not.toBeNull()
    expect(result?.shoulderWidthCm).toBeGreaterThan(0)
    expect(result?.armLengthCm).toBeGreaterThan(0)
    expect(result?.inseamCm).toBeGreaterThan(0)
    expect(result?.torsoLengthCm).toBeGreaterThan(0)
  })

  it('returns null when landmarks are missing', () => {
    expect(measureFrame([], DIMS, SCALE, HEIGHT_CM)).toBeNull()
  })

  it('is resolution-independent given a consistent scale', () => {
    const pose = syntheticStandingPose()
    const a = measureFrame(pose, { width: 1000, height: 1000 }, 0.2, HEIGHT_CM)
    const b = measureFrame(pose, { width: 2000, height: 2000 }, 0.1, HEIGHT_CM)
    expect(a?.shoulderWidthCm).toBeCloseTo(b?.shoulderWidthCm ?? 0, 4)
    expect(a?.inseamCm).toBeCloseTo(b?.inseamCm ?? 0, 4)
  })
})
