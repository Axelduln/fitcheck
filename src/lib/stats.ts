export function median(values: number[]): number {
  return quantile(values, 0.5)
}

/** Linear-interpolated quantile; `values` need not be sorted. */
export function quantile(values: number[], q: number): number {
  if (values.length === 0) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  const lower = sorted[base] ?? NaN
  const upper = sorted[base + 1] ?? lower
  return lower + rest * (upper - lower)
}

export interface RangeSummary {
  median: number
  low: number
  high: number
}

/**
 * Median plus the p10–p90 spread of the collected samples — reported
 * to the user as the confidence range (tunable percentiles).
 */
export function summarizeRange(values: number[]): RangeSummary {
  return {
    median: median(values),
    low: quantile(values, 0.1),
    high: quantile(values, 0.9),
  }
}

export type Confidence = 'high' | 'medium' | 'low'

/** Spread thresholds in cm (tunable): ≤2 high, ≤5 medium, else low. */
export function confidenceLabel(summary: RangeSummary): Confidence {
  const spread = summary.high - summary.low
  if (spread <= 2) return 'high'
  if (spread <= 5) return 'medium'
  return 'low'
}
