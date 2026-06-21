import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ModuleTabs } from '../../shared/ModuleTabs'
import { RoadmapTab } from '../../shared/RoadmapTab'
import type { ReportData, Finding, Kind, SourceFileInput } from '@locateme/core/types'
import { pickAndReadFolder, supportsFolderPicker } from './folder'

// B1: paste a single file. B2: pick a folder → engine runs in a Web Worker.
// B3: report parity (duplicates / hot files) + i18n (en/es/uk).

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

// Colors only — labels and descriptions come from i18n.
const KIND_STYLE: Record<Kind, { text: string; dot: string }> = {
  fragile: { text: 'text-red-400',          dot: 'bg-red-400' },
  stable:  { text: 'text-emerald-400',      dot: 'bg-emerald-400' },
  context: { text: 'text-amber-400',        dot: 'bg-amber-400' },
  dynamic: { text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
}

const KIND_ORDER: Kind[] = ['fragile', 'stable', 'context', 'dynamic']

interface WorkerResult {
  ok: boolean
  report?: ReportData
  error?: string
}

function Sidebar() {
  const { t } = useTranslation('locate-me')
  return (
    <div className="h-full w-[208px] flex flex-col gap-3 p-3 overflow-y-auto">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
        {t('kindsTitle')}
      </div>
      {KIND_ORDER.map(k => {
        const s = KIND_STYLE[k]
        return (
          <div key={k} className="rounded-md border border-border/60 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className={`text-xs font-medium ${s.text}`}>{t(`kinds.${k}.label`)}</span>
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">{t(`kinds.${k}.desc`)}</p>
          </div>
        )
      })}
    </div>
  )
}

function FindingRow({ f }: { f: Finding }) {
  const s = KIND_STYLE[f.kind]
  return (
    <details className="border border-border/60 rounded-md overflow-hidden">
      <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors list-none">
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot} flex-shrink-0`} />
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
  const { t } = useTranslation('locate-me')
  const k = report.summary.byKind
  const findings = report.findings
  const fragile = findings.filter(f => f.kind === 'fragile')

  if (report.summary.locatorCalls === 0) {
    return (
      <div className="rounded-md border border-border/60 p-4">
        <p className="text-sm text-foreground mb-1">{t('noLocators')}</p>
        <p className="text-xs text-muted-foreground">{t('noLocatorsDesc')}</p>
      </div>
    )
  }

  // hot files (by fragile count)
  const perFile = new Map<string, { fragile: number; total: number }>()
  for (const f of findings) {
    const e = perFile.get(f.file) ?? { fragile: 0, total: 0 }
    e.total++
    if (f.kind === 'fragile') e.fragile++
    perFile.set(f.file, e)
  }
  const hot = [...perFile.entries()]
    .filter(([, e]) => e.fragile > 0)
    .sort((a, b) => b[1].fragile - a[1].fragile)
    .slice(0, 10)

  // duplicated selectors (fragile/context in >=2 places; skip stable & dynamic)
  const byKey = new Map<string, Finding[]>()
  for (const f of findings) {
    if (f.selector === null || f.kind === 'stable') continue
    const key = `${f.method} ${f.selector}`
    const arr = byKey.get(key)
    if (arr) arr.push(f)
    else byKey.set(key, [f])
  }
  const dupes = [...byKey.values()].filter(l => l.length >= 2).sort((a, b) => b.length - a.length).slice(0, 10)
  const topDup = dupes[0]

  return (
    <div className="flex flex-col gap-4">
      {topDup && (
        <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
          <span className="text-xs text-foreground">
            {t('mostRepeated')}{' '}
            <code className="font-mono text-amber-400">{JSON.stringify(topDup[0].selector)}</code>{' '}
            {t('fixOnceClose', { count: topDup.length })}
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {KIND_ORDER.map(kind => {
          const s = KIND_STYLE[kind]
          return (
            <div key={kind} className="flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-xs text-muted-foreground">{t(`kinds.${kind}.label`)}</span>
              <span className={`text-xs font-medium tabular-nums ${s.text}`}>{k[kind]}</span>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {t('coverage', {
          files: report.summary.files,
          calls: report.summary.locatorCalls,
          classified: report.summary.coverage.classified,
          dynamic: report.summary.coverage.dynamic,
        })}
      </p>

      {hot.length > 0 && (
        <div>
          <div className="text-xs font-medium text-foreground mb-2">{t('hotFiles')}</div>
          <div className="flex flex-col gap-1">
            {hot.map(([file, e]) => (
              <div key={file} className="flex items-center justify-between text-[11px] border border-border/40 rounded px-2.5 py-1.5">
                <span className="font-mono text-muted-foreground truncate">{file}</span>
                <span className="text-muted-foreground flex-shrink-0 ml-2">
                  <span className="text-red-400 font-medium">{e.fragile}</span> {t('fragileWord')} / {e.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {dupes.length > 0 && (
        <div>
          <div className="text-xs font-medium text-foreground mb-2">{t('duplicated', { count: dupes.length })}</div>
          <div className="flex flex-col gap-1">
            {dupes.map((list, i) => {
              const s = KIND_STYLE[list[0].kind]
              const where = list.slice(0, 3).map(f => `${f.file}:${f.line}`).join(', ')
              const more = list.length > 3 ? ` +${list.length - 3}` : ''
              return (
                <div key={i} className="text-[11px] border border-border/40 rounded px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    <code className="font-mono text-foreground truncate">{JSON.stringify(list[0].selector)}</code>
                    <span className={`${s.text} font-medium flex-shrink-0`}>×{list.length}</span>
                  </div>
                  <div className="text-muted-foreground/70 mt-0.5 truncate">{where}{more}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <div className="text-xs font-medium text-foreground mb-2">
          {t('fragileLocators', { count: fragile.length })}
        </div>
        {fragile.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('noFragile')}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {fragile.map((f, i) => <FindingRow key={i} f={f} />)}
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground/70 border-t border-border/40 pt-2">
        {t('honesty')}
      </p>
    </div>
  )
}

function AuditTab() {
  const { t } = useTranslation('locate-me')
  const [code, setCode] = useState('')
  const [report, setReport] = useState<ReportData | null>(null)
  const [ran, setRan] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => () => { workerRef.current?.terminate() }, [])

  const getWorker = (): Worker => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('./locate.worker.ts', import.meta.url), { type: 'module' })
    }
    return workerRef.current
  }

  const runOnWorker = (files: SourceFileInput[], target: string, label: string) => {
    setLoading(true)
    setError(null)
    setRan(true)
    setReport(null)
    const w = getWorker()
    w.onmessage = (e: MessageEvent<WorkerResult>) => {
      setLoading(false)
      const d = e.data
      if (d.ok && d.report) {
        setReport(d.report)
        setSource(label)
      } else {
        setError(d.error ?? t('analysisFailed'))
      }
    }
    w.postMessage({ files, target })
  }

  const analyzePaste = (text: string) => {
    if (!text.trim()) { setRan(true); setReport(null); setError(null); setSource(null); return }
    runOnWorker([{ path: 'pasted.spec.ts', text }], 'pasted', t('pastedSnippet'))
  }

  const selectFolder = async () => {
    if (!supportsFolderPicker()) {
      setRan(true)
      setError(t('needChromium'))
      return
    }
    setError(null)
    setLoading(true)
    try {
      const { files, rootName } = await pickAndReadFolder()
      if (files.length === 0) {
        setLoading(false)
        setRan(true)
        setReport(null)
        setError(t('noTsFiles', { name: rootName }))
        return
      }
      runOnWorker(files, rootName, t('folderLabel', { name: rootName, count: files.length }))
    } catch (e) {
      setLoading(false)
      // user dismissed the picker → AbortError, ignore quietly
      if ((e as DOMException)?.name !== 'AbortError') {
        setRan(true)
        setError((e as Error).message)
      }
    }
  }

  const clearAll = () => {
    setCode(''); setReport(null); setRan(false); setError(null); setSource(null)
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <p className="text-xs text-muted-foreground">{t('intro')}</p>

      <div className="flex items-center gap-2 flex-wrap">
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
        {loading && <span className="text-xs text-muted-foreground animate-pulse">{t('analyzing')}</span>}
        <span className="ml-auto text-[10px] text-muted-foreground/70">{t('runsLocally')}</span>
      </div>

      <details className="border border-border/60 rounded-md">
        <summary className="px-3 py-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground list-none">
          {t('pasteToggle')}
        </summary>
        <div className="p-3 pt-0 flex flex-col gap-2">
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder={t('pastePlaceholder')}
            spellCheck={false}
            className="w-full h-44 bg-muted/30 border border-border rounded-md p-3 font-mono text-xs text-foreground resize-y focus:outline-none focus:border-foreground/40"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => analyzePaste(code)}
              disabled={loading}
              className="px-4 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {t('analyze')}
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('clear')}
            </button>
          </div>
        </div>
      </details>

      {error && (
        <p className="text-xs text-amber-400/90 border border-amber-400/30 rounded-md px-3 py-2">{error}</p>
      )}

      {source && report && (
        <p className="text-[11px] text-muted-foreground">
          {t('analyzedLabel')} <span className="text-foreground">{source}</span>
        </p>
      )}

      {report && <Results report={report} />}
      {ran && !report && !error && !loading && (
        <p className="text-xs text-muted-foreground">{t('nothingToAnalyze')}</p>
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
        className="absolute top-1/2 -translate-y-1/2 z-10 w-3.5 h-9 flex items-center justify-center bg-background border border-border rounded-r-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        style={{ left: sidebarOpen ? '208px' : '0px' }}
      >
        <span className="text-[10px]">{sidebarOpen ? '‹' : '›'}</span>
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
