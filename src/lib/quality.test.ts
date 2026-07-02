import { describe, expect, it } from 'vitest'
import { assessFrame, assessSideFrame } from './quality'
import { syntheticStandingPose } from '../test/syntheticPose'

const ASPECT = 1

/** Synthetic profile pose: torso x-coordinates collapsed to the centre. */
function syntheticSidePose() {
  return syntheticStandingPose().map((lm, i) => {
    // far-side landmarks (right side, odd-ish ids) get low visibility
    const farSide = [12, 14, 16, 24, 26, 28, 30].includes(i)
    return {
      ...lm,
      x: 0.5 + (lm.x - 0.5) * 0.08,
      visibility: farSide ? 0.2 : lm.visibility,
    }
  })
}

describe('assessFrame', () => {
  it('accepts the synthetic standing pose', () => {
    // spans y 0.15–0.92 → 77% of frame height, shoulders level
    const result = assessFrame(syntheticStandingPose(), ASPECT)
    expect(result.issues).toEqual([])
    expect(result.valid).toBe(true)
  })

  it('flags low visibility of a required landmark', () => {
    const pose = syntheticStandingPose()
    const hip = pose[23]
    if (hip) pose[23] = { ...hip, visibility: 0.3 }
    const result = assessFrame(pose, ASPECT)
    expect(result.valid).toBe(false)
    expect(result.issues).toContain('low-visibility')
  })

  it('flags a person too small in frame', () => {
    // compress the pose to half size around its center
    const pose = syntheticStandingPose().map((lm) => ({
      ...lm,
      y: 0.5 + (lm.y - 0.5) * 0.5,
    }))
    const result = assessFrame(pose, ASPECT)
    expect(result.valid).toBe(false)
    expect(result.issues).toContain('too-small')
  })

  it('flags a person too large in frame', () => {
    const pose = syntheticStandingPose().map((lm) => ({
      ...lm,
      y: 0.5 + (lm.y - 0.5) * 1.25,
    }))
    const result = assessFrame(pose, ASPECT)
    expect(result.valid).toBe(false)
    expect(result.issues).toContain('too-large')
  })

  it('flags tilted shoulders', () => {
    const pose = syntheticStandingPose()
    const shoulder = pose[11]
    // 160 px horizontal spread; 30 px vertical → ~10.6° tilt
    if (shoulder) pose[11] = { ...shoulder, y: shoulder.y + 0.03 }
    const result = assessFrame(pose, ASPECT)
    expect(result.valid).toBe(false)
    expect(result.issues).toContain('shoulders-tilted')
  })

  it('flags required landmarks at the frame edge', () => {
    const pose = syntheticStandingPose()
    const ankle = pose[27]
    if (ankle) pose[27] = { ...ankle, y: 0.995 }
    const result = assessFrame(pose, ASPECT)
    expect(result.valid).toBe(false)
    expect(result.issues).toContain('out-of-frame')
  })
})

describe('assessSideFrame', () => {
  it('accepts a profile pose with an occluded far side', () => {
    const result = assessSideFrame(syntheticSidePose(), ASPECT)
    expect(result.issues).toEqual([])
    expect(result.valid).toBe(true)
  })

  it('flags a person still facing the camera', () => {
    const result = assessSideFrame(syntheticStandingPose(), ASPECT)
    expect(result.valid).toBe(false)
    expect(result.issues).toContain('not-sideways')
  })

  it('flags low visibility when BOTH sides of a pair are hidden', () => {
    const pose = syntheticSidePose()
    for (const i of [27, 28]) {
      const lm = pose[i]
      if (lm) pose[i] = { ...lm, visibility: 0.2 }
    }
    const result = assessSideFrame(pose, ASPECT)
    expect(result.valid).toBe(false)
    expect(result.issues).toContain('low-visibility')
  })

  it('still enforces the frame-height window', () => {
    const pose = syntheticSidePose().map((lm) => ({
      ...lm,
      y: 0.5 + (lm.y - 0.5) * 0.5,
    }))
    const result = assessSideFrame(pose, ASPECT)
    expect(result.valid).toBe(false)
    expect(result.issues).toContain('too-small')
  })
})
