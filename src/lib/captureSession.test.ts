import { describe, expect, it } from 'vitest'
import { CaptureCountdown, COUNTDOWN_SECONDS } from './captureSession'
import { syntheticStandingPose } from '../test/syntheticPose'

const pose = syntheticStandingPose()

describe('CaptureCountdown', () => {
  it('starts the countdown when the pose becomes valid', () => {
    const session = new CaptureCountdown()
    const event = session.tick(true, pose, 0)
    expect(event).toEqual({ type: 'countdown', secondsLeft: COUNTDOWN_SECONDS })
  })

  it('counts down once per second and captures at zero', () => {
    const session = new CaptureCountdown()
    session.tick(true, pose, 0)
    expect(session.tick(true, pose, 500)).toBeNull()
    expect(session.tick(true, pose, 1000)).toEqual({
      type: 'countdown',
      secondsLeft: 2,
    })
    expect(session.tick(true, pose, 2000)).toEqual({
      type: 'countdown',
      secondsLeft: 1,
    })
    const captured = session.tick(true, pose, 3000)
    expect(captured?.type).toBe('captured')
    if (captured?.type === 'captured') {
      expect(captured.frames.length).toBeGreaterThan(0)
    }
  })

  it('resets on an invalid frame during the countdown', () => {
    const session = new CaptureCountdown()
    session.tick(true, pose, 0)
    session.tick(true, pose, 1000)
    expect(session.tick(false, pose, 1500)).toEqual({ type: 'reset' })
    // restarts from the beginning
    expect(session.tick(true, pose, 2000)).toEqual({
      type: 'countdown',
      secondsLeft: COUNTDOWN_SECONDS,
    })
  })

  it('does not emit reset while already idle', () => {
    const session = new CaptureCountdown()
    expect(session.tick(false, null, 0)).toBeNull()
    expect(session.tick(false, null, 100)).toBeNull()
  })

  it('captures the buffered valid frames and then goes quiet', () => {
    const session = new CaptureCountdown()
    let captured: number | null = null
    for (let t = 0; t <= 3100; t += 100) {
      const event = session.tick(true, pose, t)
      if (event?.type === 'captured') {
        captured = event.frames.length
        break
      }
    }
    expect(captured).toBe(30)
    expect(session.tick(true, pose, 4000)).toBeNull()
  })
})
