import { describe, expect, it } from 'vitest'
import { assessFrame } from './quality'
import { syntheticStandingPose } from '../test/syntheticPose'

const ASPECT = 1

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
