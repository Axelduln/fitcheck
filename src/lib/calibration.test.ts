import { describe, expect, it } from 'vitest'
import {
  computeCmPerPixel,
  EYE_TO_VERTEX_STATURE_FRACTION,
} from './calibration'
import { syntheticStandingPose } from '../test/syntheticPose'

describe('computeCmPerPixel', () => {
  it('computes the scale from eye-to-heel pixel distance', () => {
    const pose = syntheticStandingPose()
    // eyes y=0.15, heels y=0.90, frame 1000 px → 750 px eye-to-heel
    const expectedFullPx = 750 / (1 - EYE_TO_VERTEX_STATURE_FRACTION)
    const scale = computeCmPerPixel(pose, 180, 1000)
    expect(scale).toBeCloseTo(180 / expectedFullPx, 6)
  })

  it('scales inversely with frame resolution', () => {
    const pose = syntheticStandingPose()
    const at1000 = computeCmPerPixel(pose, 180, 1000)
    const at2000 = computeCmPerPixel(pose, 180, 2000)
    expect(at1000).not.toBeNull()
    expect(at2000).toBeCloseTo((at1000 ?? 0) / 2, 6)
  })

  it('rejects nonsense input', () => {
    const pose = syntheticStandingPose()
    expect(computeCmPerPixel(pose, 0, 1000)).toBeNull()
    expect(computeCmPerPixel(pose, 180, 0)).toBeNull()
    expect(computeCmPerPixel([], 180, 1000)).toBeNull()
  })

  it('rejects an upside-down pose (heels above eyes)', () => {
    const pose = syntheticStandingPose()
    for (const i of [29, 30]) {
      const lm = pose[i]
      if (lm) pose[i] = { ...lm, y: 0.05 }
    }
    expect(computeCmPerPixel(pose, 180, 1000)).toBeNull()
  })
})
