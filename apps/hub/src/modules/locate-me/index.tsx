import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ModuleTabs } from '../../shared/ModuleTabs'
import { RoadmapTab } from '../../shared/RoadmapTab'
import type { ReportData, Finding, Kind, SourceFileInput } from '@locateme/core/types'
import type { Detection } from '@locateme/core/detect'
import { pickAndReadFolder, supportsFolderPicker } from './folder'

// B5 layout (after design review): one headline + ratio bar instead of chips;
// hot files / duplicates become sort modes + a ×N badge; slim detail panel;
// a dedicated empty state.

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

const KIND_STYLE: Record<Kind, { text: string; dot: string }> = {
  fragile: { text: 'text-red-400',          dot: 'bg-red-400' },
  stable:  { text: 'text-emerald-400',      dot: 'bg-emerald-400' },
  context: { text: 'text-amber-400',        dot: 'bg-amber-400' },
  dynamic: { text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
}

// Ratio-bar segment fills — only fragile is fully saturated; stable recedes.
const KIND_SEG: Record<Kind, string> = {
  fragile: 'bg-red-400',
  context: 'bg-amber-400/70',
  stable:  'bg-emerald-400/40',
  dynamic: 'bg-muted-foreground/30',
}

const KIND_ORDER: Kind[] = ['fragile', 'stable', 'context', 'dynamic']
const FILTER_KINDS: Kind[] = ['fragile', 'context', 'dynamic']
type SortMode = 'file' | 'repeated' | 'hot'

interface WorkerResult {
  ok: boolean
  report?: ReportData
  detection?: Detection
  error?: string
}

const dupKey = (f: Finding) => `${f.method} ${f.selector}`

function buildDupCount(findings: Finding[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const f of findings) {
    if (f.selector === null || f.kind === 'stable') continue
    m.set(dupKey(f), (m.get(dupKey(f)) ?? 0) + 1)
  }
  return m
}

function buildHotRank(findings: Finding[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const f of findings) if (f.kind === 'fragile') m.set(f.file, (m.get(f.file) ?? 0) + 1)
  return m
}

function sortFindings(list: Finding[], mode: SortMode, dup: Map<string, number>, hot: Map<string, number>): Finding[] {
  const byPos = (a: Finding, b: Finding) => a.file.localeCompare(b.file) || a.line - b.line
  const arr = [...list]
  if (mode === 'repeated') arr.sort((a, b) => (dup.get(dupKey(b)) ?? 0) - (dup.get(dupKey(a)) ?? 0) || byPos(a, b))
  else if (mode === 'hot') arr.sort((a, b) => (hot.get(b.file) ?? 0) - (hot.get(a.file) ?? 0) || byPos(a, b))
  else arr.sort(byPos)
  return arr
}

function Sidebar() {
  const { t } = useTranslation('locate-me')
  return (
    <div className="w-[208px] h-full flex flex-col overflow-hidden">
      <div className="p-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{t('kindsTitle')}</p>
        <div className="flex flex-col gap-0.5">
          {KIND_ORDER.map(k => {
            const s = KIND_STYLE[k]
            return (
              <div key={k} className="flex flex-col px-2 py-1.5 rounded-md">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className={`text-xs font-medium ${s.text}`}>{t(`kinds.${k}.label`)}</span>
                </span>
                <span className="text-[11px] text-muted-foreground/80 leading-relaxed mt-0.5">
                  {t(`kinds.${k}.desc`)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Headline({ report, detection }: { report: ReportData; detection: Detection | null }) {
  const { t } = useTranslation('locate-me')
  const fragile = report.summary.byKind.fragile
  const filesWithFragile = new Set(report.findings.filter(f => f.kind === 'fragile').map(f => f.file)).size
  const stack: string[] = []
  if (detection && detection.language !== 'unknown') stack.push(detection.language)
  if (detection && detection.framework !== 'unknown') stack.push(detection.framework)

  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-lg font-semibold text-foreground">
        {fragile > 0
          ? t('headlineFragile', { count: fragile, files: filesWithFragile })
          : t('headlineClean', { files: report.summary.files })}
      </h2>
      <p className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span>{t('firstPass')}</span><span className="text-muted-foreground/40">·</span>
        <span>{t('testsNotRun')}</span>
        {stack.length > 0 && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-foreground/80">{stack.join(' · ')}</span>
          </>
        )}
        <span className="text-muted-foreground/40">·</span>
        <span>{t('callsInFiles', { calls: report.summary.locatorCalls, files: report.summary.files })}</span>
      </p>
    </div>
  )
}

function RatioBar({ byKind }: { byKind: Record<Kind, number> }) {
  const { t } = useTranslation('locate-me')
  const total = KIND_ORDER.reduce((s, k) => s + byKind[k], 0) || 1
  return (
    <div className="max-w-3xl">
      <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted/30">
        {KIND_ORDER.map(k => byKind[k] > 0 && (
          <div key={k} className={KIND_SEG[k]} style={{ width: `${(byKind[k] / total) * 100}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {KIND_ORDER.map(k => (
          <span key={k} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${KIND_STYLE[k].dot}`} />
            {t(`kinds.${k}.label`)}
            <span className={`tabular-nums ${k === 'fragile' ? 'text-red-400 font-medium' : 'text-foreground'}`}>{byKind[k]}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function DetailPanel({ finding, onClose }: { finding: Finding; onClose: () => void }) {
  const { t } = useTranslation('locate-me')
  const s = KIND_STYLE[finding.kind]
  const [copied, setCopied] = useState(false)

  const copy = () => {
    if (finding.selector === null) return
    navigator.clipboard?.writeText(finding.selector)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
      .catch(() => {})
  }

  return (
    <div className="border border-border/60 rounded-md p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${s.text} flex items-center gap-1.5`}>
          <span className={`w-2 h-2 rounded-full ${s.dot}`} />
          {t(`kinds.${finding.kind}.label`)}
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" title={t('close')}>✕</button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70">selector</span>
          {finding.selector !== null && (
            <button onClick={copy} className="text-[10px] text-muted-foreground hover:text-foreground">
              {copied ? t('copied') : t('copy')}
            </button>
          )}
        </div>
        <code className="block text-xs font-mono text-foreground bg-muted/40 rounded p-2 break-all">
          {finding.method}({finding.selector === null ? '…' : JSON.stringify(finding.selector)})
        </code>
        <div className="text-[11px] text-muted-foreground font-mono mt-1.5">{finding.file}:{finding.line}</div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-1">why</div>
        <p className="text-[11px] text-foreground/90">{finding.reason}</p>
      </div>

      {finding.snippet && (
        <pre className="text-[11px] font-mono bg-muted/40 rounded p-2 overflow-x-auto whitespace-pre text-muted-foreground">
          {finding.snippet}
        </pre>
      )}

      <details className="border-t border-border/40 pt-2">
        <summary className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer">
          {t('whyShape')}
        </summary>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{t(`explain.${finding.kind}`)}</p>
      </details>
    </div>
  )
}

function AuditTab() {
  const { t } = useTranslation('locate-me')
  const [code, setCode] = useState('')
  const [report, setReport] = useState<ReportData | null>(null)
  const [detection, setDetection] = useState<Detection | null>(null)
  const [selected, setSelected] = useState<Finding | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const [filterKinds, setFilterKinds] = useState<Set<Kind>>(new Set<Kind>(['fragile']))
  const [sortMode, setSortMode] = useState<SortMode>('file')
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => () => { workerRef.current?.terminate() }, [])

  const getWorker = (): Worker => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('./locate.worker.ts', import.meta.url), { type: 'module' })
    }
    return workerRef.current
  }

  const runOnWorker = (files: SourceFileInput[], target: string, label: string) => {
    setLoading(true); setError(null); setReport(null); setDetection(null); setSelected(null)
    const w = getWorker()
    w.onmessage = (e: MessageEvent<WorkerResult>) => {
      setLoading(false)
      const d = e.data
      if (d.ok && d.report) {
        setReport(d.report); setDetection(d.detection ?? null); setSource(label)
      } else {
        setError(d.error ?? t('analysisFailed'))
      }
    }
    w.postMessage({ files, target })
  }

  const analyzePaste = (text: string) => {
    if (!text.trim()) { setError(t('nothingToAnalyze')); return }
    runOnWorker([{ path: 'pasted.spec.ts', text }], 'pasted', t('pastedSnippet'))
  }

  const selectFolder = async () => {
    if (!supportsFolderPicker()) { setError(t('needChromium')); return }
    setError(null); setLoading(true)
    try {
      const { files, rootName } = await pickAndReadFolder()
      if (files.length === 0) { setLoading(false); setError(t('noTsFiles', { name: rootName })); return }
      runOnWorker(files, rootName, t('folderLabel', { name: rootName, count: files.length }))
    } catch (e) {
      setLoading(false)
      if ((e as DOMException)?.name !== 'AbortError') setError((e as Error).message)
    }
  }

  const toggleFilter = (k: Kind) => {
    setFilterKinds(prev => {
      const next = new Set(prev)
      next.has(k) ? next.delete(k) : next.add(k)
      return next
    })
  }

  // ---- Empty / initial state ----
  if (!report) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-16 max-w-md mx-auto">
        <div>
          <p className="text-base font-medium text-foreground mb-1">{t('emptyTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('emptyDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={selectFolder}
            disabled={loading}
            className="px-4 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {t('selectFolder')}
          </button>
          <button
            onClick={() => { setCode(SAMPLE); analyzePaste(SAMPLE) }}
            disabled={loading}
            className="px-3 py-2 rounded-md text-xs text-muted-foreground border border-border hover:text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors"
          >
            {t('trySample')}
          </button>
        </div>
        {loading && <span className="text-xs text-muted-foreground animate-pulse">{t('analyzing')}</span>}
        <details className="w-full text-left border border-border/60 rounded-md">
          <summary className="px-3 py-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground list-none">
            {t('pasteToggle')}
          </summary>
          <div className="p-3 pt-0 flex flex-col gap-2">
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder={t('pastePlaceholder')}
              spellCheck={false}
              className="w-full h-40 bg-muted/30 border border-border rounded-md p-3 font-mono text-xs text-foreground resize-y focus:outline-none focus:border-foreground/40"
            />
            <button
              onClick={() => analyzePaste(code)}
              disabled={loading}
              className="self-start px-4 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {t('analyze')}
            </button>
          </div>
        </details>
        {error && (
          <p className="text-xs text-amber-400/90 border border-amber-400/30 rounded-md px-3 py-2 w-full">{error}</p>
        )}
      </div>
    )
  }

  // ---- Results state ----
  const findings = report.findings
  const dup = buildDupCount(findings)
  const hot = buildHotRank(findings)
  const rows = sortFindings(findings.filter(f => filterKinds.has(f.kind)), sortMode, dup, hot)
  const hasLocators = report.summary.locatorCalls > 0

  return (
    <div className="flex flex-col gap-4">

      {/* compact action bar */}
      <div className="flex items-center gap-2 flex-wrap text-[11px]">
        <button onClick={selectFolder} disabled={loading}
          className="px-2.5 py-1 rounded-md font-medium bg-primary/90 text-primary-foreground hover:bg-primary disabled:opacity-50 transition-colors">
          {t('selectFolder')}
        </button>
        <button onClick={() => { setCode(SAMPLE); analyzePaste(SAMPLE) }} disabled={loading}
          className="px-2.5 py-1 rounded-md text-muted-foreground border border-border hover:text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors">
          {t('trySample')}
        </button>
        {source && <span className="text-muted-foreground">{t('analyzedLabel')} <span className="text-foreground">{source}</span></span>}
        {loading && <span className="text-muted-foreground animate-pulse">{t('analyzing')}</span>}
      </div>

      {error && (
        <p className="text-xs text-amber-400/90 border border-amber-400/30 rounded-md px-3 py-2 max-w-3xl">{error}</p>
      )}

      {!hasLocators ? (
        <div className="rounded-md border border-border/60 p-4 max-w-3xl">
          <p className="text-sm text-foreground mb-1">{t('noLocators')}</p>
          <p className="text-xs text-muted-foreground">{t('noLocatorsDesc')}</p>
        </div>
      ) : (
        <>
          <Headline report={report} detection={detection} />
          <RatioBar byKind={report.summary.byKind} />

          <div className="flex gap-4 items-start">
            {/* left: filterable / sortable list */}
            <div className="w-[400px] flex-shrink-0">
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {FILTER_KINDS.map(k => {
                  const on = filterKinds.has(k)
                  return (
                    <button key={k} onClick={() => toggleFilter(k)}
                      className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                        on ? `${KIND_STYLE[k].text} border-current` : 'text-muted-foreground border-border hover:text-foreground'
                      }`}>
                      {t(`kinds.${k}.label`)} <span className="tabular-nums">{report.summary.byKind[k]}</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-1.5 mb-2 text-[10px] text-muted-foreground">
                <span className="uppercase tracking-widest text-muted-foreground/70">{t('sortBy')}</span>
                {([['file', t('sortFile')], ['repeated', t('sortRepeated')], ['hot', t('sortHot')]] as [SortMode, string][]).map(([m, label]) => (
                  <button key={m} onClick={() => setSortMode(m)}
                    className={`px-1.5 py-0.5 rounded transition-colors ${sortMode === m ? 'text-foreground bg-muted/60' : 'hover:text-foreground'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {rows.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('noneForFilter')}</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {rows.map((f, i) => {
                    const isSel = selected === f
                    const n = dup.get(dupKey(f)) ?? 0
                    const s = KIND_STYLE[f.kind]
                    return (
                      <button key={i} onClick={() => setSelected(f)}
                        className={`flex flex-col gap-0.5 text-left px-2.5 py-2 rounded-md border transition-colors ${
                          isSel ? 'border-foreground/30 bg-muted/40' : 'border-border/60 hover:bg-muted/30'
                        }`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot} flex-shrink-0`} />
                          <span className="text-[11px] text-muted-foreground tabular-nums">{f.file}:{f.line}</span>
                          {n > 1 && <span className="text-[10px] text-amber-400 ml-auto flex-shrink-0">×{n}</span>}
                        </div>
                        <code className="text-xs font-mono text-foreground truncate">
                          {f.method}({f.selector === null ? '…' : JSON.stringify(f.selector)})
                        </code>
                        <span className="text-[10px] text-muted-foreground/80 truncate">{f.reason}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* right: detail */}
            <div className="flex-1 min-w-0">
              {selected ? (
                <DetailPanel finding={selected} onClose={() => setSelected(null)} />
              ) : (
                <div className="border border-dashed border-border/60 rounded-md p-4 text-[11px] text-muted-foreground">
                  {t('selectHint')}
                </div>
              )}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground/70 border-t border-border/40 pt-2 max-w-3xl">
            {t('honesty')}
          </p>
        </>
      )}
    </div>
  )
}

function AboutTab() {
  const { t } = useTranslation('locate-me')
  return (
    <div className="max-w-2xl flex flex-col gap-3 text-sm text-muted-foreground">
      <p>{t('about.p1')}</p>
      <p>{t('about.p2')}</p>
      <p className="text-xs text-muted-foreground/80">{t('about.p3')}</p>
    </div>
  )
}

export default function LocateMePage() {
  const { t } = useTranslation('locate-me')
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
        className="absolute top-2.5 z-20 -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-background border border-border text-sm font-bold text-cyan-400 hover:bg-muted transition-all"
        style={{ left: sidebarOpen ? '208px' : '22px' }}
        title="Toggle panel"
      >
        S
      </button>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 overflow-y-auto px-6 pt-5">
          <ModuleTabs
            tabs={[
              { id: 'audit',   label: t('tabs.audit') },
              { id: 'roadmap', label: t('tabs.roadmap') },
              { id: 'about',   label: t('tabs.about') },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <div style={{ display: activeTab === 'audit' ? 'block' : 'none' }}>
            <AuditTab />
          </div>
          <div style={{ display: activeTab === 'roadmap' ? 'block' : 'none' }}>
            <RoadmapTab namespace="locate-me" />
          </div>
          <div style={{ display: activeTab === 'about' ? 'block' : 'none' }}>
            <AboutTab />
          </div>
        </div>

        <div className="h-8 border-t border-border/50 flex items-center px-6 gap-5 flex-shrink-0">
          {(t('badges', { returnObjects: true }) as string[]).map(item => (
            <span key={item} className="text-[10px] text-muted-foreground/95">
              <span className="mr-1 text-muted-foreground/40">//</span>{item}
            </span>
          ))}
        </div>

      </main>
    </div>
  )
}
