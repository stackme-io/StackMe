import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildStats, roundCount, sizeBucket, statsBlockedReason, STATS_SUBCAUSES } from '@locateme/core/stats'
import type { ReportData, Finding, Kind } from '@locateme/core/types'
import type { Detection } from '@locateme/core/detect'

const PW: Detection = { language: 'TypeScript', framework: 'Playwright' } as Detection

function finding(kind: Kind, subcause: string | undefined, i: number): Finding {
  return {
    file: `tests/secret-project/checkout-${i}.spec.ts`,
    line: i + 1,
    method: 'locator',
    selector: kind === 'dynamic' ? null : `#acme-internal-${i}`,
    kind,
    reason: 'because AcmeCorp',
    subcause,
    snippet: 'await page.locator("#acme-internal").click()',
    prefer: 'getByRole',
  }
}

function report(spec: Array<[Kind, string | undefined, number]>): ReportData {
  const findings: Finding[] = []
  for (const [kind, sub, n] of spec) for (let i = 0; i < n; i++) findings.push(finding(kind, sub, findings.length))
  const byKind = { fragile: 0, stable: 0, context: 0, dynamic: 0 } as Record<Kind, number>
  for (const f of findings) byKind[f.kind]++
  return {
    tool: 'locateme', version: '0.0.1', scannedAt: '2026-11-12T10:00:00Z', target: 'acme-secret-repo',
    summary: { files: 7, locatorCalls: findings.length, byKind, coverage: { total: findings.length, classified: findings.length, dynamic: byKind.dynamic } },
    findings,
  }
}

describe('roundCount', () => {
  it('rounds as documented', () => {
    expect([0, 1, 4, 5, 7, 8, 97, 100, 123, 1234, 98765].map(roundCount))
      .toEqual([0, '<5', '<5', 5, 5, 10, 95, 100, 120, 1200, 99000])
  })
})

describe('sizeBucket', () => {
  it('buckets locator counts', () => {
    expect([49, 50, 99, 100, 999, 1000, 12000].map(sizeBucket))
      .toEqual([null, '50-99', '50-99', '100-249', '500-999', '1000-2499', '10000+'])
  })
})

describe('buildStats', () => {
  const r = report([['fragile', 'chain-positional', 12], ['fragile', 'text-loose', 3], ['stable', 'css-testattr', 60], ['context', 'css-class', 30], ['dynamic', undefined, 2], ['fragile', 'made-up-cause', 1]])

  it('contains only whitelisted fields', () => {
    const row = buildStats(r, PW, '5y+')!
    expect(Object.keys(row).sort()).toEqual(['age', 'framework', 'kinds', 'rules', 'schema', 'size', 'sub'])
    expect(row.framework).toBe('Playwright')
    expect(row.size).toBe('100-249')
    expect(row.kinds).toEqual({ fragile: 15, stable: 60, context: 30, dynamic: '<5' })
    expect(row.sub).toEqual({ 'chain-positional': 10, 'css-class': 30, 'css-testattr': 60, 'text-loose': '<5' })
  })

  it('never carries code, paths, names or time', () => {
    const json = JSON.stringify(buildStats(r, PW))
    for (const leak of ['acme', 'Acme', 'secret', '.spec.ts', 'tests/', 'locator(', '2026-11-12', 'getByRole', 'because']) {
      expect(json).not.toContain(leak)
    }
  })

  it('omits age when not given', () => {
    expect(buildStats(r, PW)).not.toHaveProperty('age')
  })
})

describe('statsBlockedReason', () => {
  const big = report([['stable', 'css-testattr', 60]])
  it('blocks sample, paste, small and unknown framework', () => {
    expect(statsBlockedReason(big, PW, false)).toBe('notFolder')
    expect(statsBlockedReason(big, null, true)).toBe('unknownFramework')
    expect(statsBlockedReason(report([['stable', 'css-testattr', 20]]), PW, true)).toBe('small')
    expect(statsBlockedReason(big, PW, true)).toBeNull()
  })
})

describe('sub-cause whitelist', () => {
  it('matches every subcause in classify.ts', () => {
    const src = readFileSync(resolve(__dirname, '../../../../../packages/locateme/src/core/classify.ts'), 'utf8')
    const inCode = new Set([...src.matchAll(/subcause:\s*["']([a-z-]+)["']/g)].map(m => m[1]))
    const listed = new Set(Object.values(STATS_SUBCAUSES).flat())
    expect([...inCode].sort()).toEqual([...listed].sort())
  })
})
