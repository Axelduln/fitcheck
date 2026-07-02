import { describe, expect, it } from 'vitest'
import { recommendSize, SIZE_CHARTS } from './sizing'

const unisex = SIZE_CHARTS.find((c) => c.id === 'unisex')
if (!unisex) throw new Error('unisex chart missing')

describe('SIZE_CHARTS', () => {
  it('loads three charts with contiguous, ascending ranges', () => {
    expect(SIZE_CHARTS.map((c) => c.id)).toEqual(['unisex', 'men', 'women'])
    for (const chart of SIZE_CHARTS) {
      for (let i = 1; i < chart.sizes.length; i++) {
        const prev = chart.sizes[i - 1]
        const curr = chart.sizes[i]
        expect(curr?.chestCm[0]).toBe(prev?.chestCm[1]) // contiguous
      }
    }
  })
})

describe('recommendSize', () => {
  it('matches a manual chart lookup when all dimensions agree', () => {
    // chest 96, waist 80, hip 100 → all inside unisex M
    const rec = recommendSize(unisex, { chestCm: 96, waistCm: 80, hipCm: 100 })
    expect(rec?.size).toBe('M')
    expect(rec?.perDimension).toEqual({ chest: 'M', waist: 'M', hips: 'M' })
    expect(rec?.notes).toEqual([])
  })

  it('sizes up when chest and waist disagree', () => {
    // chest 96 (M), waist 90 (L)
    const rec = recommendSize(unisex, { chestCm: 96, waistCm: 90, hipCm: 100 })
    expect(rec?.size).toBe('L')
    expect(rec?.notes.some((n) => n.includes('sized up'))).toBe(true)
  })

  it('notes a differing hip size for bottoms', () => {
    // chest/waist M, hips 110 (L)
    const rec = recommendSize(unisex, { chestCm: 96, waistCm: 80, hipCm: 110 })
    expect(rec?.size).toBe('M')
    expect(rec?.notes.some((n) => n.includes('bottoms'))).toBe(true)
  })

  it('clamps and reports values outside the chart', () => {
    const below = recommendSize(unisex, { chestCm: 60, waistCm: 50, hipCm: 60 })
    expect(below?.size).toBe('XS')
    expect(below?.notes.some((n) => n.includes('below the smallest'))).toBe(
      true,
    )
    const above = recommendSize(unisex, {
      chestCm: 140,
      waistCm: 130,
      hipCm: 140,
    })
    expect(above?.size).toBe('XXL')
    expect(above?.notes.some((n) => n.includes('above the largest'))).toBe(true)
  })

  it('adds an inseam length note when provided and differing', () => {
    const rec = recommendSize(unisex, {
      chestCm: 96,
      waistCm: 80,
      hipCm: 100,
      inseamCm: 88,
    })
    expect(rec?.perDimension.inseam).toBeDefined()
    expect(rec?.notes.some((n) => n.includes('Trouser length'))).toBe(true)
  })
})
