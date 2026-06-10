import { describe, expect, it } from 'vitest'
import { cmToInches, feetInchesToCm, inchesToCm } from './units'

describe('units', () => {
  it('converts cm to inches', () => {
    expect(cmToInches(2.54)).toBeCloseTo(1)
    expect(cmToInches(180)).toBeCloseTo(70.87, 2)
  })

  it('converts inches to cm', () => {
    expect(inchesToCm(1)).toBeCloseTo(2.54)
  })

  it('round-trips', () => {
    expect(inchesToCm(cmToInches(173))).toBeCloseTo(173)
  })

  it('converts feet + inches to cm', () => {
    expect(feetInchesToCm(5, 11)).toBeCloseTo(180.34)
    expect(feetInchesToCm(6, 0)).toBeCloseTo(182.88)
  })
})
