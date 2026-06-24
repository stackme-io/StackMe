import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { RoadmapTab } from '../../shared/RoadmapTab'
import type { ReportData, Finding, Kind, SourceFileInput } from '@locateme/core/types'
import type { Detection } from '@locateme/core/detect'
import { pickAndReadFolder, supportsFolderPicker } from './folder'

// B6 + type scale: semantic text utilities (text-title/heading/body/secondary/meta/label/code).
// Filters + sort in the left rail; taxonomy lives in the ratio legend + idle detail panel.

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
  fragile: { text: 'text-k-fragile', dot: 'bg-k-fragile' },
  stable:  { text: 'text-k-stable',  dot: 'bg-k-stable' },
  context: { text: 'text-k-context', dot: 'bg-k-context' },
  dynamic: { text: 'text-k-dynamic', dot: 'bg-k-dynamic' },
}

const KIND_SEG: Record<Kind, string> = {
  fragile: 'bg-k-fragile',
  context: 'bg-k-context/80',
  stable:  'bg-k-stable/55',
  dynamic: 'bg-k-dynamic/40',
}

const KIND_ORDER: Kind[] = ['fragile', 'stable', 'context', 'dynamic']
const FILTER_KINDS: Kind[] = ['fragile', 'context', 'dynamic']
const TAB_IDS: string[] = ['audit', 'roadmap', 'about']
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

function selectorText(f: Finding): string {
  return `${f.method}(${f.selector === null ? '…' : JSON.stringify(f.selector)})`
}

function AuditControls({ byKind, filterKinds, onToggle, sortMode, onSort }: {
  byKind: Record<Kind, number>
  filterKinds: Set<Kind>
  onToggle: (k: Kind) => void
  sortMode: SortMode
  onSort: (m: SortMode) => void
}) {
  const { t } = useTranslation('locate-me')
  const sorts: [SortMode, string][] = [['file', t('sortFile')], ['repeated', t('sortRepeated')], ['hot', t('sortHot')]]
  return (
    <div className="flex flex-col">
      <div className="p-3 border-b border-border">
        <p className="text-label text-muted-foreground mb-2">{t('filterTitle')}</p>
        <div className="flex flex-col gap-0.5">
          {FILTER_KINDS.map(k => {
            const on = filterKinds.has(k)
            return (
              <button key={k} onClick={() => onToggle(k)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${on ? 'bg-muted/50 text-foreground' : 'text-muted-foreground hover:bg-muted/30'}`}>
                <span className={`w-3.5 h-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center ${on ? `${KIND_STYLE[k].dot} border-transparent` : 'border-border'}`}>
                  {on && (
                    <svg width="9" height="9" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  )}
                </span>
                <span className="text-sub flex-1">{t(`kinds.${k}.label`)}</span>
                <span className="text-meta text-muted-foreground tabular-nums">{byKind[k]}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="p-3">
        <p className="text-label text-muted-foreground mb-2">{t('sortBy')}</p>
        <div className="flex flex-col gap-1">
          {sorts.map(([m, label]) => (
            <button key={m} onClick={() => onSort(m)}
              className={`px-2 py-1.5 rounded-md text-sub text-left border transition-colors ${sortMode === m ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:bg-muted/30'}`}>
              {label}
            </button>
          ))}
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

  const headline = fragile > 0
    ? t('headlineFragile', { locators: t('nLocators', { count: fragile }), files: t('nFiles', { count: filesWithFragile }) })
    : t('headlineClean', { files: t('nFiles', { count: report.summary.files }) })

  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="text-title text-foreground">{headline}</h2>
      <p className="text-meta text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span>{t('firstPass')}</span><span className="text-faint">·</span>
        <span>{t('testsNotRun')}</span>
        {stack.length > 0 && (
          <>
            <span className="text-faint">·</span>
            <span className="text-content">{stack.join(' · ')}</span>
          </>
        )}
        <span className="text-faint">·</span>
        <span>{t('callsInFiles', { calls: t('nCalls', { count: report.summary.locatorCalls }), files: t('nFiles', { count: report.summary.files }) })}</span>
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
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {KIND_ORDER.map(k => (
          <span key={k} className="flex items-center gap-1.5 text-meta text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${KIND_STYLE[k].dot}`} />
            {t(`kinds.${k}.label`)}
            <span className={`tabular-nums ${k === 'fragile' ? 'text-k-fragile font-medium' : 'text-foreground'}`}>{byKind[k]}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function FindingsTable({ rows, dup, selected, onSelect }: {
  rows: Finding[]
  dup: Map<string, number>
  selected: Finding | null
  onSelect: (f: Finding) => void
}) {
  const { t } = useTranslation('locate-me')
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
      <table className="w-full border-collapse table-fixed">
        <thead className="sticky top-0 z-10">
          <tr className="bg-card">
            <th className="px-4 py-2.5 text-left text-label text-muted-foreground border-b border-border w-[128px]">{t('colKind')}</th>
            <th className="px-4 py-2.5 text-left text-label text-muted-foreground border-b border-border w-[124px]">{t('colLocation')}</th>
            <th className="px-4 py-2.5 text-left text-label text-muted-foreground border-b border-border">{t('colSelector')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f, i) => {
            const isSel = selected === f
            const n = dup.get(dupKey(f)) ?? 0
            const s = KIND_STYLE[f.kind]
            return (
              <tr key={i} onClick={() => onSelect(f)}
                className={`cursor-pointer transition-colors ${isSel ? 'bg-muted/40' : 'hover:bg-muted/20'}`}>
                <td className={`px-4 py-3 border-b border-border/40 border-l-2 ${f.kind === 'fragile' ? 'border-l-k-fragile' : 'border-l-transparent'}`}>
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${s.dot} flex-shrink-0`} />
                    <span className="text-meta text-muted-foreground">{t(`kinds.${f.kind}.label`)}</span>
                  </span>
                </td>
                <td className="px-4 py-3 border-b border-border/40 text-meta text-muted-foreground font-mono truncate">{f.file}:{f.line}</td>
                <td className="px-4 py-3 border-b border-border/40">
                  <span className="flex items-center gap-2 min-w-0">
                    <code className="text-code text-foreground truncate">{selectorText(f)}</code>
                    {n > 1 && <span className="text-meta text-k-context flex-shrink-0">×{n}</span>}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FindingInspect({ finding, onClose }: { finding: Finding | null; onClose: () => void }) {
  const { t } = useTranslation('locate-me')
  const [copied, setCopied] = useState(false)

  const copy = () => {
    if (!finding || finding.selector === null) return
    navigator.clipboard?.writeText(finding.selector)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
      .catch(() => {})
  }

  return (
    <div className="w-80 flex-shrink-0 border-l border-border flex flex-col overflow-hidden">
      {!finding ? (
        <>
          <div className="px-4 py-3 border-b border-border">
            <p className="text-label text-muted-foreground">{t('inspector')}</p>
          </div>
          <p className="text-sub text-content px-4 py-4">{t('selectHint')}</p>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className={`text-sub font-medium ${KIND_STYLE[finding.kind].text} flex items-center gap-1.5`}>
              <span className={`w-2 h-2 rounded-full ${KIND_STYLE[finding.kind].dot}`} />
              {t(`kinds.${finding.kind}.label`)}
            </span>
            <button onClick={onClose} className="text-meta text-muted-foreground hover:text-foreground" title={t('close')}>✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-label text-muted-foreground">selector</span>
                {finding.selector !== null && (
                  <button onClick={copy} className="text-meta text-muted-foreground hover:text-foreground">{copied ? t('copied') : t('copy')}</button>
                )}
              </div>
              <code className="block text-code text-foreground bg-muted/40 rounded p-2.5 break-all">{selectorText(finding)}</code>
              <div className="text-meta text-muted-foreground font-mono mt-2">{finding.file}:{finding.line}</div>
            </div>
            <div>
              <div className="text-label text-muted-foreground mb-1">why</div>
              <p className="text-sub text-content">{finding.reason}</p>
            </div>
            {finding.snippet && (
              <pre className="text-code-block bg-muted/40 rounded p-2.5 overflow-x-auto whitespace-pre text-muted-foreground">{finding.snippet}</pre>
            )}
            <details className="border-t border-border/40 pt-3">
              <summary className="text-sub text-content hover:text-foreground cursor-pointer">{t('whyShape')}</summary>
              <p className="text-sub text-content mt-2">{t(`explain.${finding.kind}`)}</p>
            </details>
          </div>
        </>
      )}
    </div>
  )
}

// Left rail: audit controls on top (Audit + results only), nav pinned to the bottom.
function Rail({ activeTab, onNav, controlsVisible, controlsActive, byKind, filterKinds, onToggle, sortMode, onSort }: {
  activeTab: string
  onNav: (id: string) => void
  controlsVisible: boolean
  controlsActive: boolean
  byKind: Record<Kind, number>
  filterKinds: Set<Kind>
  onToggle: (k: Kind) => void
  sortMode: SortMode
  onSort: (m: SortMode) => void
}) {
  const { t } = useTranslation('locate-me')
  const nav: [string, string][] = [['audit', t('tabs.audit')], ['roadmap', t('tabs.roadmap')], ['about', t('tabs.about')]]
  return (
    <div className="w-[208px] h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {controlsVisible && (
          <div className={controlsActive ? '' : 'opacity-50 pointer-events-none select-none'}>
            <AuditControls byKind={byKind} filterKinds={filterKinds} onToggle={onToggle} sortMode={sortMode} onSort={onSort} />
          </div>
        )}
      </div>
      <nav className="border-t border-border p-2 flex flex-col gap-0.5 flex-shrink-0">
        {nav.map(([id, label]) => (
          <button key={id} onClick={() => onNav(id)}
            className={`text-left px-2.5 py-1.5 rounded-md text-sub transition-colors ${activeTab === id ? 'bg-muted/50 text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function LocateMePage() {
  const { t } = useTranslation('locate-me')
  const [searchParams, setSearchParams] = useSearchParams()
  const paramTab = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(paramTab && TAB_IDS.includes(paramTab) ? paramTab : 'audit')
  const [sidebarOpen, setSidebarOpen] = useState(true)

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

  // Keep the active tab in the URL (?tab=) so Roadmap/About are linkable + survive refresh.
  useEffect(() => {
    const tp = searchParams.get('tab')
    if (tp && TAB_IDS.includes(tp) && tp !== activeTab) setActiveTab(tp)
  }, [searchParams])

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
        setSelected(d.report.findings.find(f => f.kind === 'fragile') ?? d.report.findings[0] ?? null)
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
      runOnWorker(files, rootName, t('folderLabel', { name: rootName, files: t('nTsFiles', { count: files.length }) }))
    } catch (e) {
      setLoading(false)
      if ((e as DOMException)?.name !== 'AbortError') setError((e as Error).message)
    }
  }

  const toggleFilter = (k: Kind) => {
    setFilterKinds(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k); else next.add(k)
      return next
    })
  }

  const navTo = (id: string) => {
    setActiveTab(id)
    setSearchParams({ tab: id }, { replace: true })
  }

  const hasLocators = !!report && report.summary.locatorCalls > 0
  const isAudit = activeTab === 'audit'
  const railOpen = isAudit ? sidebarOpen : true

  const findings = report?.findings ?? []
  const dup = buildDupCount(findings)
  const hot = buildHotRank(findings)
  const rows = report ? sortFindings(findings.filter(f => filterKinds.has(f.kind)), sortMode, dup, hot) : []

  const btnPrimary = 'px-4 py-2 rounded-md text-sub font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors'
  const btnGhost = 'px-3 py-2 rounded-md text-sub text-muted-foreground border border-border hover:text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors'

  return (
    <div className="flex h-full relative overflow-hidden">

      <aside
        className="flex-shrink-0 border-r border-border overflow-hidden transition-all duration-200"
        style={{ width: railOpen ? '208px' : '0px' }}
      >
        <Rail
          activeTab={activeTab}
          onNav={navTo}
          controlsVisible={hasLocators}
          controlsActive={isAudit}
          byKind={report?.summary.byKind ?? { fragile: 0, stable: 0, context: 0, dynamic: 0 }}
          filterKinds={filterKinds}
          onToggle={toggleFilter}
          sortMode={sortMode}
          onSort={setSortMode}
        />
      </aside>

      {isAudit && (
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="absolute top-2.5 z-20 -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-background border border-border text-sub font-bold text-cyan-400 hover:bg-muted transition-all"
          style={{ left: railOpen ? '208px' : '22px' }}
          title="Toggle panel"
        >
          S
        </button>
      )}

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 overflow-y-auto px-6 pt-5">

          {/* ---- AUDIT ---- */}
          <div style={{ display: activeTab === 'audit' ? 'block' : 'none' }}>
            {!report ? (
              <div className="flex flex-col items-center justify-center text-center gap-4 min-h-[60vh] max-w-md mx-auto">
                <div>
                  <p className="text-heading text-foreground mb-1">{t('emptyTitle')}</p>
                  <p className="text-sub text-content">{t('emptyDesc')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={selectFolder} disabled={loading} className={btnPrimary}>{t('selectFolder')}</button>
                  <button onClick={() => { setCode(SAMPLE); analyzePaste(SAMPLE) }} disabled={loading} className={btnGhost}>{t('trySample')}</button>
                </div>
                {loading && <span className="text-sub text-muted-foreground animate-pulse">{t('analyzing')}</span>}
                <details className="w-full text-left border border-border/60 rounded-md">
                  <summary className="px-3 py-2 cursor-pointer text-sub text-muted-foreground hover:text-foreground list-none">
                    {t('pasteToggle')}
                  </summary>
                  <div className="p-3 pt-0 flex flex-col gap-2">
                    <textarea value={code} onChange={e => setCode(e.target.value)} placeholder={t('pastePlaceholder')} spellCheck={false}
                      className="w-full h-40 bg-muted/30 border border-border rounded-md p-3 text-code text-foreground resize-y focus:outline-none focus:border-foreground/40" />
                    <button onClick={() => analyzePaste(code)} disabled={loading} className={`self-start ${btnPrimary}`}>{t('analyze')}</button>
                  </div>
                </details>
                {error && <p className="text-meta text-amber-400/90 border border-amber-400/30 rounded-md px-3 py-2 w-full">{error}</p>}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 flex-wrap text-meta">
                  <button onClick={selectFolder} disabled={loading}
                    className="px-2.5 py-1 rounded-md text-sub font-medium bg-primary/90 text-primary-foreground hover:bg-primary disabled:opacity-50 transition-colors">
                    {t('selectFolder')}
                  </button>
                  <button onClick={() => { setCode(SAMPLE); analyzePaste(SAMPLE) }} disabled={loading}
                    className="px-2.5 py-1 rounded-md text-sub text-muted-foreground border border-border hover:text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors">
                    {t('trySample')}
                  </button>
                  {source && <span className="text-muted-foreground">{t('analyzedLabel')} <span className="text-foreground">{source}</span></span>}
                  {loading && <span className="text-muted-foreground animate-pulse">{t('analyzing')}</span>}
                </div>

                {error && <p className="text-meta text-amber-400/90 border border-amber-400/30 rounded-md px-3 py-2 max-w-3xl">{error}</p>}

                {!hasLocators ? (
                  <div className="rounded-md border border-border/60 p-4 max-w-3xl">
                    <p className="text-body text-foreground mb-1">{t('noLocators')}</p>
                    <p className="text-sub text-content">{t('noLocatorsDesc')}</p>
                  </div>
                ) : (
                  <>
                    <Headline report={report} detection={detection} />
                    <RatioBar byKind={report.summary.byKind} />

                    {rows.length === 0 ? (
                      <p className="text-sub text-content">{t('noneForFilter')}</p>
                    ) : (
                      <div className="flex rounded-lg border border-border overflow-hidden max-h-[62vh]">
                        <FindingsTable rows={rows} dup={dup} selected={selected} onSelect={setSelected} />
                        <FindingInspect finding={selected} onClose={() => setSelected(null)} />
                      </div>
                    )}

                    <p className="text-meta text-muted-foreground border-t border-border/40 pt-2.5 max-w-3xl">{t('honesty')}</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ---- ROADMAP ---- */}
          <div style={{ display: activeTab === 'roadmap' ? 'block' : 'none' }}>
            <RoadmapTab namespace="locate-me" />
          </div>

          {/* ---- ABOUT ---- */}
          <div style={{ display: activeTab === 'about' ? 'block' : 'none' }}>
            <div className="max-w-2xl flex flex-col gap-3 text-body text-content">
              <p>{t('about.p1')}</p>
              <p>{t('about.p2')}</p>
              <p className="text-sub text-content">{t('about.p3')}</p>
            </div>
          </div>
        </div>

        <div className="h-8 border-t border-border/50 flex items-center px-6 gap-5 flex-shrink-0">
          {(t('badges', { returnObjects: true }) as string[]).map(item => (
            <span key={item} className="text-meta text-muted-foreground">
              <span className="mr-1 text-faint">//</span>{item}
            </span>
          ))}
        </div>

      </main>
    </div>
  )
}
