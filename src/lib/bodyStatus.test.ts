import { describe, expect, it } from 'vitest'
import {
  computeBodyStatus,
  REQUIRED_LANDMARKS,
  StatusDebouncer,
} from './bodyStatus'
import type { NormalizedLandmark } from './pose'

function fullPose(visibility = 0.95): NormalizedLandmark[] {
  return Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility,
  }))
}

describe('computeBodyStatus', () => {
  it('returns none without a pose', () => {
    expect(computeBodyStatus(null)).toBe('none')
    expect(computeBodyStatus([])).toBe('none')
  })

  it('returns full when all required landmarks are visible', () => {
    expect(computeBodyStatus(fullPose())).toBe('full')
  })

  it('returns partial when a required landmark is below the threshold', () => {
    for (const index of REQUIRED_LANDMARKS) {
      const pose = fullPose()
      pose[index] = { x: 0.5, y: 0.5, z: 0, visibility: 0.3 }
      expect(computeBodyStatus(pose)).toBe('partial')
    }
  })

  it('ignores low visibility on non-required landmarks', () => {
    const pose = fullPose()
    pose[17] = { x: 0.5, y: 0.5, z: 0, visibility: 0.1 } // left pinky
    expect(computeBodyStatus(pose)).toBe('full')
  })
})

describe('StatusDebouncer', () => {
  it('reports a status only after it has been stable', () => {
    const debouncer = new StatusDebouncer()
    expect(debouncer.tick('full', 0)).toBeNull()
    expect(debouncer.tick('full', 400)).toBeNull()
    expect(debouncer.tick('full', 900)).toBe('full')
  })

  it('does not re-report an unchanged status', () => {
    const debouncer = new StatusDebouncer()
    debouncer.tick('full', 0)
    debouncer.tick('full', 900)
    expect(debouncer.tick('full', 2000)).toBeNull()
  })

  it('ignores flicker shorter than the stability window', () => {
    const debouncer = new StatusDebouncer()
    debouncer.tick('full', 0)
    debouncer.tick('full', 900) // stable: full
    expect(debouncer.tick('partial', 1000)).toBeNull()
    expect(debouncer.tick('full', 1200)).toBeNull()
    expect(debouncer.tick('full', 2100)).toBeNull() // back to current, no change
  })

  it('reports a flickering status once it settles', () => {
    const debouncer = new StatusDebouncer()
    debouncer.tick('none', 0)
    debouncer.tick('none', 900)
    debouncer.tick('partial', 1000)
    expect(debouncer.tick('partial', 1900)).toBe('partial')
  })
})
