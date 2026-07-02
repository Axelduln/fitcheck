import chartsJson from '../data/sizecharts.json'

export interface SizeEntry {
  size: string
  chestCm: [number, number]
  waistCm: [number, number]
  hipCm: [number, number]
  inseamCm: [number, number]
}

export interface SizeChart {
  id: string
  label: string
  sizes: SizeEntry[]
}

// JSON imports type arrays as number[], not [number, number] tuples
export const SIZE_CHARTS: SizeChart[] = (
  chartsJson as unknown as { charts: SizeChart[] }
).charts

export interface SizingInput {
  chestCm: number
  waistCm: number
  hipCm: number
  inseamCm?: number
}

export interface SizeRecommendation {
  size: string
  /** Size each dimension points to on its own. */
  perDimension: Record<string, string>
  /** Honest fit notes ("chest says M, waist says L → size up"). */
  notes: string[]
}

type Dimension = 'chestCm' | 'waistCm' | 'hipCm' | 'inseamCm'

/**
 * Index of the size whose range contains the value; clamps below the
 * smallest / above the largest range and reports it.
 */
function sizeIndexFor(
  chart: SizeChart,
  dimension: Dimension,
  value: number,
): { index: number; clamped: 'below' | 'above' | null } {
  const first = chart.sizes[0]
  const last = chart.sizes[chart.sizes.length - 1]
  if (first && value < first[dimension][0]) {
    return { index: 0, clamped: 'below' }
  }
  if (last && value >= last[dimension][1]) {
    return { index: chart.sizes.length - 1, clamped: 'above' }
  }
  const index = chart.sizes.findIndex(
    (entry) => value >= entry[dimension][0] && value < entry[dimension][1],
  )
  return { index: index === -1 ? 0 : index, clamped: null }
}

/**
 * Recommendation: tops are driven by the larger of chest and waist
 * ("size up for comfort" when they disagree); hips and inseam add
 * notes for bottoms rather than changing the top size.
 */
export function recommendSize(
  chart: SizeChart,
  input: SizingInput,
): SizeRecommendation | null {
  if (chart.sizes.length === 0) return null

  const chest = sizeIndexFor(chart, 'chestCm', input.chestCm)
  const waist = sizeIndexFor(chart, 'waistCm', input.waistCm)
  const hip = sizeIndexFor(chart, 'hipCm', input.hipCm)

  const sizeAt = (i: number) => chart.sizes[i]?.size ?? '?'
  const perDimension: Record<string, string> = {
    chest: sizeAt(chest.index),
    waist: sizeAt(waist.index),
    hips: sizeAt(hip.index),
  }

  const recommendedIndex = Math.max(chest.index, waist.index)
  const size = sizeAt(recommendedIndex)
  const notes: string[] = []

  if (chest.index !== waist.index) {
    notes.push(
      `Chest suggests ${sizeAt(chest.index)}, waist suggests ${sizeAt(waist.index)} — sized up to ${size} for comfort.`,
    )
  }
  if (hip.index !== recommendedIndex) {
    notes.push(`For bottoms, your hips suggest ${sizeAt(hip.index)}.`)
  }
  if (input.inseamCm !== undefined) {
    const inseam = sizeIndexFor(chart, 'inseamCm', input.inseamCm)
    perDimension.inseam = sizeAt(inseam.index)
    if (inseam.index !== recommendedIndex) {
      notes.push(
        `Trouser length: your inseam matches size ${sizeAt(inseam.index)}.`,
      )
    }
  }
  if (chest.clamped === 'below' || waist.clamped === 'below') {
    notes.push('You are below the smallest size in this chart.')
  }
  if (chest.clamped === 'above' || waist.clamped === 'above') {
    notes.push('You are above the largest size in this chart.')
  }

  return { size, perDimension, notes }
}
