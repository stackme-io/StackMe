// Public baseline from the open-source study (data from 7 September 2026, after the
// classifier correction). Shipped with the page, so comparing a suite against it happens
// entirely in the browser - nothing about the user's suite is sent anywhere.

export const BASELINE = {
  tiers: [
    { key: 'top', pct: 2.5 },
    { key: 'mid', pct: 2.8 },
    { key: 'tail', pct: 2.9 },
  ],
  habits: { position: 45, text: 45, xpath: 2.6 },
  // Same 50+ locator rule as shared results, so the columns measure the same thing.
  comparable: { suites: 189, median: 1.2, pooled: 2.7, none: 33, position: 44.4, text: 45.3, xpath: 2.7 },
}

// Fragile share (%) of each of the 189 public projects with 50+ locators, sorted.
export const PUBLIC_SHARES: readonly number[] = [
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0.15,0.16,0.19,0.23,0.24,0.29,0.3,0.37,0.38,0.41,0.42,0.5,0.5,0.66,0.71,0.76,0.77,0.77,0.78,0.82,0.84,0.94,1.01,1.01,1.02,1.02,
  1.03,1.1,1.1,1.11,1.12,1.13,1.21,1.22,1.27,1.28,1.28,1.32,1.37,1.38,1.42,1.45,1.52,1.54,1.56,1.59,1.61,1.74,1.77,1.78,1.89,1.9,
  2.06,2.14,2.15,2.16,2.17,2.24,2.24,2.28,2.29,2.4,2.69,2.7,2.78,2.99,3.01,3.03,3.08,3.18,3.18,3.25,3.29,3.33,3.47,3.52,3.59,3.67,
  3.74,3.79,3.81,3.87,3.93,4.11,4.21,4.3,4.43,4.45,4.53,4.6,4.71,4.75,5.05,5.46,5.56,5.9,5.95,6.08,6.2,6.45,6.75,6.76,7.02,7.03,
  7.25,7.38,7.57,7.69,7.73,7.75,8.16,8.67,9.43,9.68,10.71,11.46,11.86,11.9,12.4,13.24,13.74,19.09,20.08,22.12,22.34,22.76,34.91,
]

export type PublicPosition =
  | { kind: 'zero'; pct: number }  // no fragile locators; pct = share of public projects also at zero
  | { kind: 'more'; pct: number }  // more fragile than pct% of public projects
  | { kind: 'less'; pct: number }  // less fragile than pct% of public projects

// Where a suite with this fragile share (%) sits among the public projects.
export function publicPosition(share: number, shares: readonly number[] = PUBLIC_SHARES): PublicPosition {
  const n = shares.length
  const pct = (count: number) => Math.round((100 * count) / n)
  if (share <= 0) return { kind: 'zero', pct: pct(shares.filter(s => s === 0).length) }
  const below = shares.filter(s => s < share).length
  const above = shares.filter(s => s > share).length
  return below >= above ? { kind: 'more', pct: pct(below) } : { kind: 'less', pct: pct(above) }
}
