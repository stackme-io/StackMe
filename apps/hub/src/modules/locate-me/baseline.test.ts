import { describe, it, expect } from 'vitest'
import { BASELINE, PUBLIC_SHARES, publicPosition } from './baseline'

describe('public baseline data', () => {
  it('matches the published summary numbers', () => {
    expect(PUBLIC_SHARES.length).toBe(BASELINE.comparable.suites)
    const zero = PUBLIC_SHARES.filter(s => s === 0).length
    expect(Math.round((100 * zero) / PUBLIC_SHARES.length)).toBe(BASELINE.comparable.none)
    const sorted = [...PUBLIC_SHARES].sort((a, b) => a - b)
    expect(sorted).toEqual([...PUBLIC_SHARES])
    expect(Math.round(10 * sorted[Math.floor(sorted.length / 2)]) / 10).toBe(BASELINE.comparable.median)
  })
})

describe('publicPosition', () => {
  it('treats zero as its own case', () => {
    expect(publicPosition(0)).toEqual({ kind: 'zero', pct: 33 })
  })
  it('says "more than" for suites above the median', () => {
    const p = publicPosition(8.3)
    expect(p.kind).toBe('more')
    expect(p.pct).toBeGreaterThan(80)
  })
  it('says "less than" for suites below the median', () => {
    const p = publicPosition(0.5)
    expect(p.kind).toBe('less')
    expect(p.pct).toBeGreaterThan(50)
  })
  it('works on a tiny custom list', () => {
    expect(publicPosition(2, [0, 1, 3, 4])).toEqual({ kind: 'more', pct: 50 })
    expect(publicPosition(5, [0, 1, 3, 4])).toEqual({ kind: 'more', pct: 100 })
  })
})
