import { useState } from 'react'
import { ModuleTabs } from '../../shared/ModuleTabs'
import { analyze } from '@locateme/core/analyze'
import type { ReportData, Finding, Kind } from '@locateme/core/types'

// B1 vertical slice: the real engine runs in the browser on pasted test code.
// Folder input + Web Worker = B2; i18n + Roadmap + detail panel = B3.

const BADGES = ['no setup', 'runs locally', 'no data collected', 'open source']

const SAMPLE = `import { test } from '@playwright/test'

test('checkout', async ({ page }) => {
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await page.locator('//div[3]/span[2]/button').click()
  await page.locator('.list > li:nth-child(2)').click()
  await page.locator('div.css-1a2b3c').click()
  await page.getByText('Order total').isVisible()
  await page.locator('[data-testid="checkout"]').click()
  await page.locator(dynamicSelector).click()
})
`

const KIND_META: Record<Kind, { label: string; text: string; dot: string; desc: string }> = {
  fragile: { label: 'Fragile', text: 'text-red-400',         dot: 'bg-red-400',         desc: 'Positional / structural — breaks on layout changes.' },
  stable:  { label: 'Stable',  text: 'text-emerald-400',     dot: 'bg-emerald-400',     desc: 'Role / test-id / label — resilient, recommended.' },
  context: { label: 'Context', text: 'text-amber-400',       dot: 'bg-amber-400',       desc: 'Text / class / attribute — depends on your project.' },
  dynamic: { label: 'Dynamic', text: 'text-muted-foreground', dot: 'bg-muted-foreground', desc: 'Built at runtime — not classified (blind spot).' },
}

const KIND_ORDER: Kind[] = ['fragile', 'stable', 'context', 'dynamic']

function Sidebar() {
  return (
    <div className="h-full w-[208px] flex flex-col gap-3 p-3 overflow-y-auto">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
        Locator kinds
      </div>
      {KIND_ORDER.map(k => {
        const m = KIND_META[k]
        return (
          <div key={k} className="rounded-md border border-border/60 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-2 h-2 rounded-full ${m.dot}`} />
              <span className={`text-xs font-medium ${m.text}`}>{m.label}</span>
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">{m.desc}</p>
          </div>
        )
      })}
    </div>
  )
}

function FindingRow({ f }: { f: Finding }) {
  const m = KIND_META[f.kind]
  return (
    <details className="border border-border/60 rounded-md overflow-hidden">
      <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors list-none">
        <span className={`w-1.5 h-1.5 rounded-full ${m.dot} flex-shrink-0`} />
        <span className="text-[11px] text-muted-foreground tabular-nums flex-shrink-0">
          {f.file}:{f.line}
        </span>
        <code className="text-xs font-mono text-foreground truncate">
          {f.method}({f.selector === null ? '…' : JSON.stringify(f.selector)})
        </code>
      </summary>
      <div className="px-3 pb-3 pt-1 border-t border-border/40">
        <p className="text-[11px] text-muted-foreground mb-2">{f.reason}</p>
        {f.snippet && (
          <pre className="text-[11px] font-mono bg-muted/40 rounded p-2 overflow-x-auto whitespace-pre text-muted-foreground">
            {f.snippet}
          </pre>
        )}
      </div>
    </details>
  )
}

function Results({ report }: { report: ReportData }) {
  const k = report.summary.byKind
  const fragile = report.findings.filter(f => f.kind === 'fragile')

  if (report.summary.locatorCalls === 0) {
    return (
      <div className="rounded-md border border-border/60 p-4">
        <p className="text-sm text-foreground mb-1">No Playwright locators found.</p>
        <p className="text-xs text-muted-foreground">
          This doesn't look like a Playwright/TS test — there's simply nothing to analyze here.
          That's not a verdict.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {KIND_ORDER.map(kind => {
          const m = KIND_META[kind]
          return (
            <div key={kind} className="flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1">
              <span className={`w-2 h-2 rounded-full ${m.dot}`} />
              <span className="text-xs text-muted-foreground">{m.label}</span>
              <span className={`text-xs font-medium tabular-nums ${m.text}`}>{k[kind]}</span>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {report.summary.locatorCalls} locator calls · classified {report.summary.coverage.classified} ·
        dynamic {report.summary.coverage.dynamic} (not classified)
      </p>

      <div>
        <div className="text-xs font-medium text-foreground mb-2">
          Fragile locators ({fragile.length})
        </div>
        {fragile.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No fragile locators in this pass. Good sign — but a first pass, not a full verdict (tests not run).
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {fragile.map((f, i) => <FindingRow key={i} f={f} />)}
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground/70 border-t border-border/40 pt-2">
        LocateMe reads test code statically and groups locators by shape. It explains why, never auto-fixes,
        and gives no single score. First pass, not a full verdict — tests are not executed.
      </p>
    </div>
  )
}

function AuditTab() {
  const [code, setCode] = useState('')
  const [report, setReport] = useState<ReportData | null>(null)
  const [ran, setRan] = useState(false)

  const run = (text: string) => {
    setRan(true)
    if (!text.trim()) { setReport(null); return }
    setReport(analyze([{ path: 'pasted.spec.ts', text }], 'pasted'))
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <p className="text-xs text-muted-foreground">
        Paste a Playwright/TypeScript test below and audit its locators — fully in your browser, nothing leaves the page.
      </p>

      <textarea
        value={code}
        onChange={e => setCode(e.target.value)}
        placeholder="// paste your *.spec.ts here"
        spellCheck={false}
        className="w-full h-56 bg-muted/30 border border-border rounded-md p-3 font-mono text-xs text-foreground resize-y focus:outline-none focus:border-foreground/40"
      />

      <div className="flex items-center gap-2">
        <button
          onClick={() => run(code)}
          className="px-4 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Analyze
        </button>
        <button
          onClick={() => { setCode(SAMPLE); run(SAMPLE) }}
          className="px-3 py-2 rounded-md text-xs text-muted-foreground border border-border hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          Try sample
        </button>
        {code && (
          <button
            onClick={() => { setCode(''); setReport(null); setRan(false) }}
            className="px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground/70">runs locally · nothing uploaded</span>
      </div>

      {report && <Results report={report} />}
      {ran && !report && (
        <p className="text-xs text-muted-foreground">Nothing to analyze — paste some test code first.</p>
      )}
    </div>
  )
}

function AboutTab() {
  return (
    <div className="max-w-2xl flex flex-col gap-3 text-sm text-muted-foreground">
      <p>
        <span className="text-foreground font-medium">LocateMe</span> is a static locator-fragility audit
        for Playwright / TypeScript test suites. It reads your test code only — no runtime, no test execution —
        and groups locators by shape: fragile, stable, context, or dynamic.
      </p>
      <p>
        It surfaces <span className="text-foreground">why</span> a locator may be brittle and where the same
        selector repeats, so you can fix one place and close many. It never auto-rewrites your tests and gives
        no single quality score — just facts you can act on.
      </p>
      <p className="text-xs text-muted-foreground/80">
        Everything runs in your browser. Your code never leaves the page. Open source, MIT.
      </p>
    </div>
  )
}

export default function LocateMePage() {
  const [activeTab, setActiveTab] = useState('audit')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-full relative overflow-hidden">

      <aside
        className="flex-shrink-0 border-r border-border overflow-hidden transition-all duration-200"
        style={{ width: sidebarOpen ? '208px' : '0px' }}
      >
        <Sidebar />
      </aside>

      <button
        onClick={() => setSidebarOpen(o => !o)}
        className="absolute top-1/2 -translate-y-1/2 z-10 w-3.5 h-9 flex items-center justify-center bg-background border border-border rounded-r-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        style={{ left: sidebarOpen ? '208px' : '0px' }}
      >
        <span className="text-[10px]">{sidebarOpen ? '‹' : '›'}</span>
      </button>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 overflow-y-auto px-6 pt-5">
          <ModuleTabs
            tabs={[
              { id: 'audit', label: 'Audit' },
              { id: 'about', label: 'About' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <div style={{ display: activeTab === 'audit' ? 'block' : 'none' }}>
            <AuditTab />
          </div>
          <div style={{ display: activeTab === 'about' ? 'block' : 'none' }}>
            <AboutTab />
          </div>
        </div>

        <div className="h-8 border-t border-border/50 flex items-center px-6 gap-5 flex-shrink-0">
          {BADGES.map(item => (
            <span key={item} className="text-[10px] text-muted-foreground/95">
              <span className="mr-1 text-muted-foreground/40">//</span>{item}
            </span>
          ))}
        </div>
      </main>
    </div>
  )
}
