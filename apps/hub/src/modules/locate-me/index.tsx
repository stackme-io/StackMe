import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { RoadmapTab } from '../../shared/RoadmapTab'
import type { ReportData, Finding, Kind, SourceFileInput } from '@locateme/core/types'
import type { Detection } from '@locateme/core/detect'
import { pickAndReadFolder, supportsFolderPicker } from './folder'
import { Crosshair, Route, Info, ArrowRight, ChevronRight } from 'lucide-react'
import { useLocateRail } from '../../store/locateRail'

// B6 + type scale: semantic text utilities (text-title/heading/body/secondary/meta/label/code).
// Filters + sort in the left rail; taxonomy lives in the ratio legend + idle detail panel.

// Two correlated sample files: login (stable-heavy) + checkout (fragile-heavy, the hot file).
// They share an identical selector so cross-file duplicate counting is visible.
const SAMPLE_LOGIN = `import { test, expect } from '@playwright/test'

test('sign in', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill('a@b.com')
  await page.getByLabel('Password').fill('secret')
  await page.getByTestId('login-submit').click()
  await page.getByText('Welcome back').isVisible()
  await page.locator('//div[3]/span[2]/button').click()
})

test('profile', async ({ page }) => {
  await page.getByRole('link', { name: 'Account' }).click()
  await page.getByLabel('Display name').fill('Sam')
  await page.getByTestId('save-profile').click()
  await page.getByPlaceholder('Search settings').fill('theme')
  await page.locator('.sidebar .item.active').click()
  await page.getByTitle('Sign out').click()
})
`

const SAMPLE_CHECKOUT = `import { test, expect } from '@playwright/test'

test('cart', async ({ page }) => {
  await page.locator('//div[3]/span[2]/button').click()
  await page.locator('.product-card:nth-child(1)').click()
  await page.locator('div.sc-1a2b3c').click()
  await page.locator('//ul/li[4]/div/button').click()
  await page.getByRole('button', { name: 'Checkout' }).click()
})

test('payment', async ({ page }) => {
  await page.locator('.list > li:nth-child(2)').click()
  await page.locator('xpath=//table/tbody/tr[3]/td[2]').click()
  await page.locator('div.css-1a2b3c').click()
  await page.getByLabel('Card number').fill('4242')
  await page.locator('//nav/a[5]').click()
  await page.locator(rowSelector).click()
  await page.getByText('Order total').isVisible()
})

test('confirm', async ({ page }) => {
  await page.locator('.navbar > ul > li:nth-child(2) a').click()
  await page.locator('button.sc-9z8y7x').click()
  await page.locator(dynamicSelector).click()
  await page.getByTestId('place-order').click()
})
`

const SAMPLE_FILES: SourceFileInput[] = [
  { path: 'login.spec.ts', text: SAMPLE_LOGIN },
  { path: 'checkout.spec.ts', text: SAMPLE_CHECKOUT },
]

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

// Selected-state classes for the filter chips. Full literal strings so Tailwind keeps them.
const KIND_CHIP: Record<Kind, string> = {
  fragile: 'bg-k-fragile/15 border-k-fragile/40',
  stable:  'bg-k-stable/15 border-k-stable/40',
  context: 'bg-k-context/15 border-k-context/40',
  dynamic: 'bg-k-dynamic/15 border-k-dynamic/40',
}

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

function AuditControls({ sortMode, onSort, fileList, fileExcluded, onToggleFile, fileFragile }: {
  sortMode: SortMode
  onSort: (m: SortMode) => void
  fileList: string[]
  fileExcluded: Set<string>
  onToggleFile: (f: string) => void
  fileFragile: Map<string, number>
}) {
  const { t } = useTranslation('locate-me')
  const multi = fileList.length > 1
  const sorts: [SortMode, string, string][] = [
    ['file', t('sortFile'), t('sortFileHint')],
    ['repeated', t('sortRepeated'), t('sortRepeatedHint')],
    ...(multi ? [['hot', t('sortHot'), t('sortHotHint')] as [SortMode, string, string]] : []),
  ]
  return (
    <div className="flex flex-col">
      {multi && (
        <div className="px-3 pt-5 pb-3 border-b border-border">
          <p className="text-label text-muted-foreground mb-2">{t('filesTitle')}</p>
          <div className="flex flex-col gap-0.5">
            {fileList.map(file => {
              const on = !fileExcluded.has(file)
              const frag = fileFragile.get(file) ?? 0
              return (
                <button key={file} onClick={() => onToggleFile(file)} title={file}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${on ? 'bg-muted/50 text-foreground' : 'text-muted-foreground hover:bg-muted/30'}`}>
                  <span className={`w-3.5 h-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center ${on ? 'bg-primary border-transparent' : 'border-border'}`}>
                    {on && (
                      <svg width="9" height="9" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                    )}
                  </span>
                  <span className="text-sub flex-1 truncate font-mono">{file}</span>
                  {frag > 0 && <span className="text-meta text-k-fragile tabular-nums flex-shrink-0">{frag}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <div className="px-3 pt-5 pb-3">
        <p className="text-label text-muted-foreground mb-3">{t('sortBy')}</p>
        <div className="flex flex-col gap-1.5">
          {sorts.map(([m, label, hint]) => (
            <button key={m} onClick={() => onSort(m)}
              className={`flex flex-col items-start gap-0.5 px-2.5 py-1.5 rounded-md text-left border transition-colors ${sortMode === m ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:bg-muted/30'}`}>
              <span className="text-sub">{label}</span>
              <span className="text-meta text-muted-foreground/80 leading-snug">{hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Headline({ report, detection, source }: { report: ReportData; detection: Detection | null; source: string | null }) {
  const { t } = useTranslation('locate-me')
  const stack: string[] = []
  if (detection && detection.language !== 'unknown') stack.push(detection.language)
  if (detection && detection.framework !== 'unknown') stack.push(detection.framework)

  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="text-title text-foreground">
        {t('headlineCount', { calls: t('nCalls', { count: report.summary.locatorCalls }), files: t('nFiles', { count: report.summary.files }) })}
      </h2>
      <p className="text-meta text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {source && <span className="text-content">{t('analyzedLabel')} {source}</span>}
        {source && stack.length > 0 && <span className="text-faint">·</span>}
        {stack.length > 0 && <span>{stack.join(' · ')}</span>}
      </p>
    </div>
  )
}

// Ratio bar + the legend doubles as the filter: click a chip (or a bar segment) to toggle a kind.
function RatioBar({ byKind, filterKinds, onToggle }: {
  byKind: Record<Kind, number>
  filterKinds: Set<Kind>
  onToggle: (k: Kind) => void
}) {
  const { t } = useTranslation('locate-me')
  const total = KIND_ORDER.reduce((s, k) => s + byKind[k], 0) || 1
  return (
    <div className="max-w-3xl">
      <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted/30">
        {KIND_ORDER.map(k => byKind[k] > 0 && (
          <button key={k} type="button" onClick={() => onToggle(k)}
            title={`${t(`kinds.${k}.label`)}: ${byKind[k]}`}
            className={KIND_SEG[k]}
            style={{ width: `${(byKind[k] / total) * 100}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {KIND_ORDER.map(k => {
          const on = filterKinds.has(k)
          const empty = byKind[k] === 0
          return (
            <button key={k} type="button" disabled={empty} onClick={() => onToggle(k)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-meta transition-colors ${
                empty ? 'opacity-40 pointer-events-none border-transparent text-muted-foreground'
                : on ? `${KIND_CHIP[k]} text-foreground`
                : 'border-transparent text-muted-foreground hover:bg-muted/40'}`}>
              <span className={`w-2 h-2 rounded-full ${KIND_STYLE[k].dot}`} />
              {t(`kinds.${k}.label`)}
              <span className="tabular-nums text-foreground/90">{byKind[k]}</span>
            </button>
          )
        })}
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
            <th className="px-4 py-2.5 text-left text-label text-muted-foreground border-b border-border border-l-2 border-l-transparent w-[116px]">{t('colKind')}</th>
            <th className="px-4 py-2.5 text-left text-label text-muted-foreground border-b border-border w-[150px]">{t('colLocation')}</th>
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
                className={`cursor-pointer transition-colors ${isSel ? 'bg-muted/70' : 'hover:bg-muted/20'}`}>
                <td className={`px-4 py-3 border-b border-border/40 border-l-2 ${isSel ? 'border-l-primary' : f.kind === 'fragile' ? 'border-l-k-fragile/60' : 'border-l-transparent'}`}>
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${s.dot} flex-shrink-0`} />
                    <span className="text-meta text-muted-foreground">{t(`kinds.${f.kind}.label`)}</span>
                  </span>
                </td>
                <td className="px-4 py-3 border-b border-border/40 text-meta text-muted-foreground font-mono truncate" title={`${f.file}:${f.line}`}>{f.file}:{f.line}</td>
                <td className="px-4 py-3 border-b border-border/40">
                  <span className="flex items-start gap-2 min-w-0">
                    <code className="text-code text-foreground break-all">{selectorText(f)}</code>
                    {n > 1 && (
                      <span title={t('copiesTip', { count: n })}
                        className="flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded bg-k-context/15 text-k-context text-meta leading-none whitespace-nowrap">
                        {t('copies', { count: n })}
                      </span>
                    )}
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

function FindingInspect({ finding, dupLocations, onClose }: { finding: Finding | null; dupLocations: string[]; onClose: () => void }) {
  const { t } = useTranslation('locate-me')
  const [copied, setCopied] = useState(false)
  const [showCode, setShowCode] = useState(false)

  // Reset transient panel state whenever a different finding is selected.
  useEffect(() => { setShowCode(false); setCopied(false) }, [finding])

  const copy = () => {
    if (!finding || finding.selector === null) return
    navigator.clipboard?.writeText(finding.selector)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
      .catch(() => {})
  }

  return (
    <div className="w-[440px] flex-shrink-0 border-l border-border flex flex-col overflow-hidden">
      {!finding ? (
        <>
          <div className="px-4 py-3 border-b border-border">
            <p className="text-label text-muted-foreground">{t('inspector')}</p>
          </div>
          <p className="text-sub text-content px-4 py-4">{t('selectHint')}</p>
        </>
      ) : (
        <>
          <div className="px-4 py-3.5 border-b border-border flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2.5 min-w-0">
              <span className={`text-heading font-medium ${KIND_STYLE[finding.kind].text} flex items-center gap-2`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${finding.confidence === 'context' ? 'border border-current' : KIND_STYLE[finding.kind].dot}`} />
                {t(`kinds.${finding.kind}.label`)}
                {finding.confidence === 'context' && (
                  <span className="text-meta font-normal text-muted-foreground normal-case">· first pass</span>
                )}
              </span>
              <p className="text-sub text-muted-foreground leading-relaxed">{finding.reason}</p>
            </div>
            <button onClick={onClose} className="text-meta text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5" title={t('close')}>✕</button>
          </div>
          <div className="flex-1 overflow-y-auto">

            <div className="px-4 py-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-label text-muted-foreground">selector</span>
                  {finding.selector !== null && (
                    <button onClick={copy} className="text-meta text-muted-foreground hover:text-foreground">{copied ? t('copied') : t('copy')}</button>
                  )}
                </div>
                <code className="block text-code text-foreground bg-muted/40 rounded border-l-2 border-l-transparent px-3 py-2.5 break-all">{selectorText(finding)}</code>
              </div>

              {finding.prefer && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-k-stable" />
                    <span className="text-label text-k-stable">prefer</span>
                  </div>
                  <p className="text-sub text-content bg-k-stable/10 rounded border-l-2 border-l-k-stable px-3 py-2.5">{finding.prefer}</p>
                </div>
              )}
            </div>

            {(dupLocations.length > 1 || finding.snippet) && (
              <div className="border-t border-border px-4 py-5 flex flex-col gap-5">
                {dupLocations.length > 1 && (
                  <div>
                    <div className="text-label text-muted-foreground mb-1.5">{t('dupTitle')}</div>
                    <p className="text-sub text-content mb-1.5">{t('copiesTip', { count: dupLocations.length })}</p>
                    <div className="flex flex-col gap-0.5">
                      {dupLocations.map((loc, i) => (
                        <span key={i} className="text-meta text-muted-foreground font-mono">{loc}</span>
                      ))}
                    </div>
                  </div>
                )}
                {finding.snippet && (
                  <div>
                    <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-1.5 text-label text-muted-foreground hover:text-foreground">
                      <ChevronRight className={`w-3 h-3 transition-transform ${showCode ? 'rotate-90' : ''}`} />
                      code
                      <span className="text-meta text-faint font-mono normal-case ml-1">{finding.file}:{finding.line}</span>
                    </button>
                    {showCode && (
                      <div className="text-code-block bg-muted/40 rounded py-2 overflow-hidden mt-2">
                        {finding.snippet.split('\n').map((raw, i) => {
                          const m = raw.match(/^(.) +(\d+) {2}(.*)$/)
                          const active = raw.startsWith('›')
                          return (
                            <div key={i} className={`flex items-center border-l-2 ${active ? 'bg-k-fragile/10 border-l-k-fragile/70' : 'border-l-transparent'}`}>
                              <span className="select-none text-faint text-right pl-2 pr-2.5 tabular-nums flex-shrink-0" style={{ minWidth: '2.75rem' }}>{m ? m[2] : ''}</span>
                              <code className="whitespace-pre overflow-hidden text-ellipsis pr-2.5 text-muted-foreground">{m ? m[3] : raw}</code>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Left rail: audit controls on top (Audit + results only), nav pinned to the bottom.
function Rail({ activeTab, onNav, controlsVisible, controlsActive, sortMode, onSort, fileList, fileExcluded, onToggleFile, fileFragile }: {
  activeTab: string
  onNav: (id: string) => void
  controlsVisible: boolean
  controlsActive: boolean
  sortMode: SortMode
  onSort: (m: SortMode) => void
  fileList: string[]
  fileExcluded: Set<string>
  onToggleFile: (f: string) => void
  fileFragile: Map<string, number>
}) {
  const { t } = useTranslation('locate-me')
  const nav = [
    { id: 'audit',   label: t('tabs.audit'),   Icon: Crosshair },
    { id: 'roadmap', label: t('tabs.roadmap'), Icon: Route },
    { id: 'about',   label: t('tabs.about'),   Icon: Info },
  ]
  return (
    <div className="w-[208px] h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {controlsVisible && (
          <div className={controlsActive ? '' : 'opacity-50 pointer-events-none select-none'}>
            <AuditControls sortMode={sortMode} onSort={onSort} fileList={fileList} fileExcluded={fileExcluded} onToggleFile={onToggleFile} fileFragile={fileFragile} />
          </div>
        )}
      </div>
      <nav className="border-t border-border p-3 flex flex-col gap-1.5 flex-shrink-0">
        {nav.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => onNav(id)}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-md border text-sub text-left transition-colors ${
              activeTab === id
                ? 'border-border bg-muted/50 text-foreground font-medium'
                : 'border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}>
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
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
  const { open: sidebarOpen, setAvailable: setRailAvailable } = useLocateRail()
  const [hintsOpen, setHintsOpen] = useState(() => {
    try { return localStorage.getItem('locateme-hints') !== '0' } catch { return true }
  })
  const hideHints = () => { setHintsOpen(false); try { localStorage.setItem('locateme-hints', '0') } catch { /* ignore */ } }
  const showHints = () => { setHintsOpen(true); try { localStorage.setItem('locateme-hints', '1') } catch { /* ignore */ } }

  const [code, setCode] = useState('')
  const [report, setReport] = useState<ReportData | null>(null)
  const [detection, setDetection] = useState<Detection | null>(null)
  const [selected, setSelected] = useState<Finding | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const [skipped, setSkipped] = useState(0)
  const [filterKinds, setFilterKinds] = useState<Set<Kind>>(new Set<Kind>(['fragile']))
  const [fileExcluded, setFileExcluded] = useState<Set<string>>(new Set())
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
      } else {
        setError(d.error ?? t('analysisFailed'))
      }
    }
    w.postMessage({ files, target })
  }

  const analyzePaste = (text: string) => {
    if (!text.trim()) { setError(t('nothingToAnalyze')); return }
    setSkipped(0)
    runOnWorker([{ path: 'pasted.spec.ts', text }], 'pasted', t('pastedSnippet'))
  }

  const runSample = () => {
    setCode(''); setSkipped(0)
    runOnWorker(SAMPLE_FILES, 'sample', t('sampleLabel', { files: t('nTsFiles', { count: SAMPLE_FILES.length }) }))
  }

  const selectFolder = async () => {
    if (!supportsFolderPicker()) { setError(t('needChromium')); return }
    setError(null); setLoading(true)
    try {
      const { files, rootName, skipped: skippedCount } = await pickAndReadFolder()
      if (files.length === 0) { setLoading(false); setError(t('noTsFiles', { name: rootName })); return }
      setSkipped(skippedCount)
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

  const toggleFile = (file: string) => {
    setFileExcluded(prev => {
      const next = new Set(prev)
      if (next.has(file)) next.delete(file); else next.add(file)
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

  // Expose the rail toggle to the app header (variant B). The toggle is only
  // meaningful on the Audit view, so advertise availability there and retract it
  // when leaving Audit or unmounting LocateMe.
  useEffect(() => {
    setRailAvailable(isAudit)
    return () => setRailAvailable(false)
  }, [isAudit, setRailAvailable])

  const findings = report?.findings ?? []
  const dup = buildDupCount(findings)
  const hot = buildHotRank(findings)
  const fileList = Array.from(new Set(findings.map(f => f.file)))
  const rows = report ? sortFindings(findings.filter(f => filterKinds.has(f.kind) && !fileExcluded.has(f.file)), sortMode, dup, hot) : []
  const totalCalls = findings.length
  const selDupLocations = selected && selected.selector !== null && selected.kind !== 'stable'
    ? findings.filter(f => dupKey(f) === dupKey(selected)).map(f => `${f.file}:${f.line}`)
    : []

  // Reset the per-file filter whenever a new report loads.
  useEffect(() => { setFileExcluded(new Set()) }, [report])

  // Keep the selected finding in sync with the visible rows: if nothing is selected,
  // or the current selection is filtered out, fall back to the first visible row.
  useEffect(() => {
    if (!report) return
    if (selected && filterKinds.has(selected.kind) && !fileExcluded.has(selected.file)) return
    setSelected(rows[0] ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, filterKinds, sortMode, fileExcluded])

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
          sortMode={sortMode}
          onSort={setSortMode}
          fileList={fileList}
          fileExcluded={fileExcluded}
          onToggleFile={toggleFile}
          fileFragile={hot}
        />
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* ---- AUDIT (height-locked: only the table scrolls) ---- */}
        <div
          style={{ display: activeTab === 'audit' ? 'flex' : 'none' }}
          className="flex-1 min-h-0 flex-col px-6 pt-5 max-w-[1320px] gap-4"
        >
          {!report ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-7 px-4 relative">

              <div className="flex justify-center relative">
                <div className="text-center flex-shrink-0 relative -mt-3">

                  {hintsOpen && (
                    <div className="hidden lg:flex items-center gap-3 absolute top-1/2 -translate-y-1/2 right-full mr-6 text-left w-max">
                      <div className="flex flex-col gap-3.5 items-start whitespace-nowrap" style={{ fontFamily: "'Neucha', cursive" }}>
                        <span className="text-[18px] text-muted-foreground ml-1 -mb-2">{t('giveLead')}</span>
                        <span className="text-[20px] leading-tight text-foreground border border-muted-foreground/45 rounded-[14px] px-3 py-1.5">{t('giveLine1')}</span>
                        <span className="text-[20px] leading-tight text-foreground border border-muted-foreground/45 rounded-[14px] px-3 py-1.5">{t('giveLine2')}</span>
                        <span className="text-[20px] leading-tight text-foreground border border-muted-foreground/45 rounded-[14px] px-3 py-1.5">{t('giveLine3')}</span>
                      </div>
                      <svg className="w-4 h-36 flex-shrink-0 text-muted-foreground/70" viewBox="0 0 16 96" fill="none" aria-hidden="true">
                        <path d="M3 3 q6 0 6 21 q0 24 6 24 q-6 0 -6 24 q0 21 -6 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <svg className="w-7 h-6 flex-shrink-0 text-muted-foreground" viewBox="0 0 28 24" fill="none" aria-hidden="true">
                        <defs><marker id="lm-in" markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto"><path d="M1 1 L7 4 L1 7" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></marker></defs>
                        <path d="M2 12 H22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" markerEnd="url(#lm-in)" />
                      </svg>
                    </div>
                  )}

                  <div className="mb-4">
                    <p className="text-heading text-foreground mb-1">{t('emptyTitle')}</p>
                    <p className="text-sub text-content max-w-[280px] mx-auto">{t('emptyDesc')}</p>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={selectFolder} disabled={loading} className={btnPrimary}>{t('selectFolder')}</button>
                    <button onClick={runSample} disabled={loading} className={btnGhost}>{t('trySample')}</button>
                  </div>
                  {loading && <div className="text-sub text-muted-foreground animate-pulse mt-3">{t('analyzing')}</div>}

                  <div className="hidden lg:flex items-center gap-3 absolute top-1/2 -translate-y-1/2 left-full ml-6 text-left w-max">
                    {hintsOpen ? (
                      <button onClick={hideHints} title={t('hideTips')} className="absolute -top-7 right-0 text-meta text-muted-foreground hover:text-foreground">✕</button>
                    ) : (
                      <button onClick={showHints} className="absolute -top-7 right-0 text-meta text-muted-foreground hover:text-foreground underline decoration-dotted underline-offset-2">{t('showTips')}</button>
                    )}
                    <svg className={`w-7 h-6 flex-shrink-0 text-muted-foreground${hintsOpen ? '' : ' invisible'}`} viewBox="0 0 28 24" fill="none" aria-hidden="true">
                      <defs><marker id="lm-out" markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto"><path d="M1 1 L7 4 L1 7" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></marker></defs>
                      <path d="M2 12 H22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" markerEnd="url(#lm-out)" />
                    </svg>
                    <svg className={`w-4 h-36 flex-shrink-0 text-muted-foreground/70${hintsOpen ? '' : ' invisible'}`} viewBox="0 0 16 96" fill="none" aria-hidden="true">
                      <path d="M13 3 q-6 0 -6 21 q0 24 -6 24 q6 0 6 24 q0 21 6 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className={`flex flex-col gap-3 items-start whitespace-nowrap${hintsOpen ? '' : ' invisible'}`} style={{ fontFamily: "'Neucha', cursive" }}>
                      <span className="text-[18px] text-muted-foreground ml-0.5 -mb-2">{t('getLead')}</span>
                      <span className="flex items-center gap-2 text-[20px] leading-tight text-foreground"><span className="w-3 h-3 rounded-full bg-k-fragile flex-shrink-0" />{t('getFragile')}</span>
                      <span className="flex items-center gap-2 text-[20px] leading-tight text-foreground"><span className="w-3 h-3 rounded-full bg-k-stable flex-shrink-0" />{t('getStable')}</span>
                      <span className="flex items-center gap-2 text-[20px] leading-tight text-foreground"><span className="w-3 h-3 rounded-full bg-k-context flex-shrink-0" />{t('getContext')}</span>
                      <span className="text-[17px] text-muted-foreground mt-1">{t('getWhy')}</span>
                    </div>
                  </div>

                </div>
              </div>

              <div className="w-full max-w-md flex flex-col gap-3">
                <details className="border border-border/60 rounded-md">
                  <summary className="px-3 py-2 cursor-pointer text-sub text-muted-foreground hover:text-foreground list-none text-center">{t('pasteToggle')}</summary>
                  <div className="p-3 pt-0 flex flex-col gap-2">
                    <textarea value={code} onChange={e => setCode(e.target.value)} placeholder={t('pastePlaceholder')} spellCheck={false}
                      className="w-full h-40 bg-muted/30 border border-border rounded-md p-3 text-code text-foreground resize-y focus:outline-none focus:border-foreground/40" />
                    <button onClick={() => analyzePaste(code)} disabled={loading} className={`self-start ${btnPrimary}`}>{t('analyze')}</button>
                  </div>
                </details>
                {error && <p className="text-meta text-amber-400/90 border border-amber-400/30 rounded-md px-3 py-2">{error}</p>}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap text-meta flex-shrink-0">
                <button onClick={selectFolder} disabled={loading}
                  className="px-2.5 py-1 rounded-md text-sub font-medium bg-primary/90 text-primary-foreground hover:bg-primary disabled:opacity-50 transition-colors">
                  {t('selectFolder')}
                </button>
                <button onClick={runSample} disabled={loading}
                  className="px-2.5 py-1 rounded-md text-sub text-muted-foreground border border-border hover:text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors">
                  {t('trySample')}
                </button>
                {loading && <span className="text-muted-foreground animate-pulse">{t('analyzing')}</span>}
              </div>

              {error && <p className="text-meta text-amber-400/90 border border-amber-400/30 rounded-md px-3 py-2 max-w-3xl flex-shrink-0">{error}</p>}

              {!hasLocators ? (
                <div className="rounded-md border border-border/60 p-4 max-w-3xl">
                  <p className="text-body text-foreground mb-1">{t('noLocators')}</p>
                  <p className="text-sub text-content">{t('noLocatorsDesc')}</p>
                </div>
              ) : (
                <>
                  <div className="flex-shrink-0"><Headline report={report} detection={detection} source={source} /></div>
                  {skipped > 0 && (
                    <p className="text-meta text-muted-foreground/80 flex-shrink-0 -mt-2" title={t('skippedTip')}>{t('skippedFiles', { count: skipped })}</p>
                  )}
                  <div className="flex-shrink-0"><RatioBar byKind={report.summary.byKind} filterKinds={filterKinds} onToggle={toggleFilter} /></div>

                  {rows.length === 0 ? (
                    <p className="text-sub text-content">{t('noneForFilter')}</p>
                  ) : (
                    <>
                      <p className="text-meta text-muted-foreground flex-shrink-0 -mb-1">{t('showingOf', { shown: rows.length, total: totalCalls })}</p>
                      <div className="flex-1 min-h-0 flex rounded-lg border border-border overflow-hidden">
                        <FindingsTable rows={rows} dup={dup} selected={selected} onSelect={setSelected} />
                        <FindingInspect finding={selected} dupLocations={selDupLocations} onClose={() => setSelected(null)} />
                      </div>
                    </>
                  )}

                  <p className="text-meta text-muted-foreground border-t border-border/40 pt-2.5 flex-shrink-0">{t('honesty')}</p>
                </>
              )}
            </>
          )}
        </div>

        {/* ---- ROADMAP ---- */}
        <div style={{ display: activeTab === 'roadmap' ? 'block' : 'none' }} className="flex-1 overflow-y-auto px-6 pt-5">
          <RoadmapTab namespace="locate-me" />
        </div>

        {/* ---- ABOUT ---- */}
        <div style={{ display: activeTab === 'about' ? 'block' : 'none' }} className="flex-1 overflow-y-auto px-6 pt-5">
          <div className="max-w-2xl flex flex-col gap-3 text-body text-content">
            <p>{t('about.p1')}</p>
            <p>{t('about.p2')}</p>
            <p className="text-sub text-content">{t('about.p3')}</p>
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
