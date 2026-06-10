import { describe, expect, it } from 'vitest'
import { FpsMeter } from './fps'

describe('FpsMeter', () => {
  it('counts frames within the last second', () => {
    const meter = new FpsMeter()
    for (let i = 0; i < 29; i++) {
      meter.tick(i * 33)
    }
    // 30th frame at 957 ms: all 30 frames within the 1 s window
    expect(meter.tick(29 * 33)).toBe(30)
  })

  it('drops frames older than one second', () => {
    const meter = new FpsMeter()
    meter.tick(0)
    meter.tick(100)
    expect(meter.tick(1500)).toBe(1)
    expect(meter.tick(1600)).toBe(2)
  })

  it('resets', () => {
    const meter = new FpsMeter()
    meter.tick(0)
    meter.reset()
    expect(meter.tick(10)).toBe(1)
  })
})
