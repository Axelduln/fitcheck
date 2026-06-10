import { describe, expect, it } from 'vitest'
import { confidenceLabel, median, quantile, summarizeRange } from './stats'

describe('median', () => {
  it('handles odd and even counts', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })
})

describe('quantile', () => {
  it('interpolates between values', () => {
    expect(quantile([0, 10], 0.5)).toBe(5)
    expect(quantile([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 0.1)).toBe(10)
  })

  it('returns NaN for empty input', () => {
    expect(quantile([], 0.5)).toBeNaN()
  })
})

describe('summarizeRange', () => {
  it('reports median and p10–p90 spread', () => {
    const values = Array.from({ length: 11 }, (_, i) => i * 10) // 0..100
    const summary = summarizeRange(values)
    expect(summary.median).toBe(50)
    expect(summary.low).toBe(10)
    expect(summary.high).toBe(90)
  })

  it('collapses for constant input', () => {
    const summary = summarizeRange([42, 42, 42])
    expect(summary.median).toBe(42)
    expect(summary.low).toBe(42)
    expect(summary.high).toBe(42)
  })
})

describe('confidenceLabel', () => {
  it('maps spread to confidence', () => {
    expect(confidenceLabel({ median: 50, low: 49.5, high: 50.5 })).toBe('high')
    expect(confidenceLabel({ median: 50, low: 48, high: 52 })).toBe('medium')
    expect(confidenceLabel({ median: 50, low: 45, high: 55 })).toBe('low')
  })
})
