import { describe, expect, it } from 'vitest'
import { selectMostProminent, type NormalizedLandmark } from './pose'

function poseSpanning(top: number, bottom: number): NormalizedLandmark[] {
  return [
    { x: 0.5, y: top, z: 0, visibility: 1 },
    { x: 0.5, y: (top + bottom) / 2, z: 0, visibility: 1 },
    { x: 0.5, y: bottom, z: 0, visibility: 1 },
  ]
}

describe('selectMostProminent', () => {
  it('returns null for no detections', () => {
    expect(selectMostProminent([])).toBeNull()
  })

  it('returns the only pose when one person is in frame', () => {
    const pose = poseSpanning(0.1, 0.9)
    expect(selectMostProminent([pose])).toBe(pose)
  })

  it('picks the pose with the largest vertical span', () => {
    const small = poseSpanning(0.4, 0.6)
    const large = poseSpanning(0.1, 0.95)
    expect(selectMostProminent([small, large])).toBe(large)
    expect(selectMostProminent([large, small])).toBe(large)
  })
})
