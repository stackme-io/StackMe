import { useState, useRef, useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { RoadmapTab } from '../../shared/RoadmapTab'
import type { ReportData, Finding, Kind, SourceFileInput } from '@locateme/core/types'
import type { Detection } from '@locateme/core/detect'
import { pickAndReadFolder, supportsFolderPicker } from './folder'
import { SAMPLE_FILES } from './sample'
import { renderHtml } from '@locateme/core/report'
import { Anchor, Route, Info, ArrowRight, ChevronRight, FileText, Archive, Trash2 } from 'lucide-react'
import { useLocateRail } from '../../store/locateRail'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useAuth, useClerk } from '@clerk/clerk-react'
import apiClient from '../../api/client'

// B6 + type scale: semantic text utilities (text-title/heading/body/secondary/meta/label/code).
// Filters + sort in the left rail; taxonomy lives in the ratio legend + idle detail panel.
// The demo suite lives in ./sample - realistic (8 nested files, ~120 locators) so the
// screen is exercised the way a real repo would, not a 2-file toy.

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

const TAB_IDS: string[] = ['audit', 'roadmap', 'about', 'reports']
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

// File-name display for the rail (basename-first). Right-truncating a full path keeps the
// shared prefix (tests/e2e/…) and eats the basename - the one part that differentiates.
// So we show the basename primarily and only reveal the folder when basenames collide.
function baseName(p: string): string {
  const i = p.lastIndexOf('/')
  return i === -1 ? p : p.slice(i + 1)
}
function dirName(p: string): string {
  const i = p.lastIndexOf('/')
  return i === -1 ? '' : p.slice(0, i)
}
// Last two folder segments, prefixed with … when deeper - keeps the nearest (differentiating) dirs.
function shortDir(dir: string): string {
  const segs = dir.split('/').filter(Boolean)
  return segs.length <= 2 ? segs.join('/') : '…/' + segs.slice(-2).join('/')
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
  // Reveal the folder line only for basenames that appear more than once.
  const baseCounts = new Map<string, number>()
  for (const f of fileList) baseCounts.set(baseName(f), (baseCounts.get(baseName(f)) ?? 0) + 1)
  const sorts: [SortMode, string, string][] = [
    ['file', t('sortFile'), t('sortFileHint')],
    ['repeated', t('sortRepeated'), t('sortRepeatedHint')],
    ...(multi ? [['hot', t('sortHot'), t('sortHotHint')] as [SortMode, string, string]] : []),
  ]
  return (
    <div className="flex flex-col">
      {multi && (
        <div className="px-3 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <p className="text-label text-muted-foreground">{t('filesTitle')}</p>
            <span className="text-meta text-faint pr-2">{t('fragileWord')}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {fileList.map(file => {
              const on = !fileExcluded.has(file)
              const frag = fileFragile.get(file) ?? 0
              const collides = (baseCounts.get(baseName(file)) ?? 0) > 1
              return (
                <button key={file} onClick={() => onToggleFile(file)} title={file}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${on ? 'bg-muted/50 text-foreground' : 'text-muted-foreground hover:bg-muted/30'}`}>
                  <span className={`w-3.5 h-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center ${on ? 'border-muted-foreground/50 bg-muted-foreground/15 text-foreground' : 'border-border text-transparent'}`}>
                    {on && (
                      <svg width="9" height="9" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3 5.5L6.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sub truncate">{baseName(file)}</span>
                    {collides && dirName(file) && (
                      <span className="block text-meta text-muted-foreground/70 truncate">{shortDir(dirName(file))}</span>
                    )}
                  </span>
                  {frag > 0 && (
                    <span title={t('nLocators', { count: frag })} className="flex items-center gap-1 flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-k-fragile flex-shrink-0" />
                      <span className="text-meta text-muted-foreground tabular-nums">{frag}</span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <div className="px-3 pt-5 pb-3">
        <div className="mb-5"><p className="text-label text-muted-foreground">{t('sortBy')}</p></div>
        {/* Flat list (same visual language as FILES above) and the hint shows only under
            the selected option - three permanent hint lines become one. */}
        <div className="flex flex-col gap-0.5">
          {sorts.map(([m, label, hint]) => {
            const on = sortMode === m
            return (
              <button key={m} onClick={() => onSort(m)}
                className={`flex flex-col items-start gap-0.5 px-2 py-1.5 rounded-md text-left transition-colors ${on ? 'bg-muted/50 text-foreground' : 'text-muted-foreground hover:bg-muted/30'}`}>
                <span className="text-sub">{label}</span>
                {on && <span className="text-meta text-muted-foreground/80 leading-snug">{hint}</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Headline({ detection, source, calls, files, action }: { detection: Detection | null; source: string | null; calls: number; files: number; action?: React.ReactNode }) {
  const { t } = useTranslation('locate-me')
  const stack: string[] = []
  if (detection && detection.language !== 'unknown') stack.push(detection.language)
  if (detection && detection.framework !== 'unknown') stack.push(detection.framework)

  return (
    <div className="flex flex-col gap-1.5 w-fit max-w-full">
      <div className="flex items-center justify-between gap-x-4 gap-y-1 flex-wrap">
        <h2 className="text-title text-foreground">
          {t('headlineCount', { calls: t('nCalls', { count: calls }), files: t('nFiles', { count: files }) })}
        </h2>
        {action}
      </div>
      {/* The caveat sits next to the number it qualifies - a scope limit must never be
          a click away (the mechanics of HOW we judge live in the "How we judge" sheet). */}
      <p className="text-meta text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-content">{t('firstPass')}, {t('testsNotRun')}</span>
        {source && <><span className="text-faint">·</span><span>{source}</span></>}
        {stack.length > 0 && <><span className="text-faint">·</span><span>{stack.join(' · ')}</span></>}
        {detection?.framework === 'Selenium' && (
          <span className="text-meta px-1.5 py-0.5 rounded border border-border text-muted-foreground/80">beta</span>
        )}
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
    <div>
      <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-muted/30">
        {KIND_ORDER.map(k => byKind[k] > 0 && (
          <button key={k} type="button" onClick={() => onToggle(k)}
            title={`${t(`kinds.${k}.label`)}: ${byKind[k]}`}
            aria-label={`${t(`kinds.${k}.label`)}: ${byKind[k]}`}
            className={`${KIND_SEG[k]} cursor-pointer transition-[filter,opacity] hover:brightness-125 ${filterKinds.has(k) ? '' : 'opacity-60 hover:opacity-100'}`}
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

// Report reflects the file scope (checked files), not the kind filter. Rebuild a
// scoped ReportData so the report's own sections/counts match what the user kept.
function scopedReport(report: ReportData, fileExcluded: Set<string>): ReportData {
  if (fileExcluded.size === 0) return report
  const findings = report.findings.filter(f => !fileExcluded.has(f.file))
  const byKind: Record<Kind, number> = { fragile: 0, stable: 0, context: 0, dynamic: 0 }
  for (const f of findings) byKind[f.kind]++
  const dynamic = byKind.dynamic
  const files = new Set(findings.map(f => f.file)).size
  return {
    ...report,
    summary: {
      ...report.summary,
      files,
      locatorCalls: findings.length,
      byKind,
      coverage: { total: findings.length, classified: findings.length - dynamic, dynamic },
    },
    findings,
  }
}

// Explicit data export - the deliberate opposite of Share. Opens a self-contained,
// printable HTML report (save as PDF via the browser). Client-safe masks paths + code.
function ReportButton({ report, fileExcluded, source }: { report: ReportData; fileExcluded: Set<string>; source: string | null }) {
  const { t } = useTranslation('locate-me')
  const { isSignedIn, getToken } = useAuth()
  const { openSignIn } = useClerk()
  const [open, setOpen] = useState(false)
  const [saveMode, setSaveMode] = useState(false)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) { setSaveMode(false); setSaved(false); setError(''); return }
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  // Open = full report (view your own audit). Download = client-safe (masked paths, no
  // code) - the artifact you forward to someone auditing their own code.
  const openReport = () => {
    const html = renderHtml(scopedReport(report, fileExcluded))
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    const a = document.createElement('a')
    a.href = url; a.target = '_blank'; a.rel = 'noopener'
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    setOpen(false)
  }
  const downloadReport = () => {
    const html = renderHtml(scopedReport(report, fileExcluded), { share: true })
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'locateme-report.html'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1_000)
    setOpen(false)
  }

  // Save = explicit opt-in that sends the report data to your account (leaves the browser).
  const startSave = () => {
    if (!isSignedIn) { openSignIn(); return }
    setTitle((source ?? 'Locator audit').slice(0, 120))
    setSaved(false); setError(''); setSaveMode(true)
  }
  const doSave = async () => {
    setSaving(true); setError('')
    try {
      const d = scopedReport(report, fileExcluded)
      const token = await getToken()
      await apiClient.post('/api/locate/reports', {
        title: title.trim() || 'Untitled audit',
        data: d,
        fragile: d.summary.byKind.fragile,
        total: d.summary.locatorCalls,
        files: d.summary.files,
      }, { headers: { Authorization: `Bearer ${token}` } })
      setOpen(false)
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status
      setError(status === 409 ? t('report.saveNameTaken') : t('report.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} title={t('report.button')}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sub text-muted-foreground border border-border hover:text-foreground hover:bg-muted/40 transition-colors">
        <FileText className="w-3.5 h-3.5" />
        {t('report.button')}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 rounded-md border border-border bg-card shadow-lg z-50 p-1.5">
          {saveMode ? (
            <div className="flex flex-col gap-2 p-1">
              <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} autoFocus
                onKeyDown={e => { if (e.key === 'Enter') doSave() }}
                placeholder={t('report.saveTitlePlaceholder')}
                className="w-full px-2 py-1.5 rounded border border-border bg-muted/30 text-meta text-foreground focus:outline-none focus:border-[var(--tool-accent,#22d3ee)]" />
              <div className="flex items-center gap-2">
                <button onClick={doSave} disabled={saving}
                  className="px-3 py-1.5 rounded text-meta font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {saving ? '...' : t('report.saveConfirm')}
                </button>
                <button onClick={() => setSaveMode(false)}
                  className="px-3 py-1.5 rounded text-meta text-muted-foreground hover:text-foreground transition-colors">
                  {t('close')}
                </button>
                {error && <span className="text-meta text-k-fragile ml-auto">{error}</span>}
              </div>
            </div>
          ) : (
            <>
              <button onClick={openReport}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-meta text-foreground hover:bg-muted transition-colors">
                <span className="w-3.5 text-center text-muted-foreground flex-shrink-0">↗</span>
                {t('report.open')}
              </button>
              <button onClick={downloadReport}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-meta text-foreground hover:bg-muted transition-colors">
                <span className="w-3.5 text-center text-muted-foreground flex-shrink-0">↓</span>
                {t('report.download')}
                <span className="ml-auto text-meta text-muted-foreground">{t('report.clientSafe')}</span>
              </button>
              <button onClick={startSave}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-meta text-foreground hover:bg-muted transition-colors border-t border-border/60 mt-1 pt-2">
                <Archive className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                {saved ? t('report.saved') : isSignedIn ? t('report.save') : t('report.saveSignIn')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Saved reports tab (rail). Reports live where they're created; account-scoped, sign-in gated.
function SavedReports() {
  const { t } = useTranslation('locate-me')
  const { isSignedIn, getToken } = useAuth()
  const { openSignIn } = useClerk()
  const [items, setItems] = useState<{ id: number; title: string; fragile: number; total: number; files: number; created_at: string }[] | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const load = async () => {
    if (!isSignedIn) { setItems([]); return }
    try {
      const token = await getToken()
      const res = await apiClient.get('/api/locate/reports', { headers: { Authorization: `Bearer ${token}` } })
      setItems(res.data)
    } catch { setItems([]) }
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isSignedIn])

  const openSaved = async (id: number) => {
    try {
      const token = await getToken()
      const res = await apiClient.get(`/api/locate/reports/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      const html = renderHtml(res.data.data as ReportData)
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
      const a = document.createElement('a')
      a.href = url; a.target = '_blank'; a.rel = 'noopener'
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch { /* ignore */ }
  }
  const remove = async (id: number) => {
    try {
      const token = await getToken()
      await apiClient.delete(`/api/locate/reports/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      setItems(prev => (prev ?? []).filter(r => r.id !== id))
    } catch { /* ignore */ }
  }

  if (!isSignedIn) {
    return (
      <div className="max-w-md">
        <p className="text-sub text-content mb-3">{t('reports.signInDesc')}</p>
        <button onClick={() => openSignIn()} className="px-4 py-2 rounded-md text-sub font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">{t('reports.signIn')}</button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-title text-foreground">{t('reports.title')}</h2>
        {items && items.length > 0 && <span className="text-meta text-muted-foreground">{t('reports.count', { count: items.length })}</span>}
      </div>
      <p className="text-meta text-muted-foreground -mt-1">{t('reports.note')}</p>

      {items === null ? (
        <p className="text-sub text-muted-foreground">{t('analyzing')}</p>
      ) : items.length === 0 ? (
        <p className="text-sub text-content">{t('reports.empty')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map(r => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sub text-foreground truncate">{r.title}</p>
                <p className="text-meta text-muted-foreground">
                  <span className="text-k-fragile">{t('nLocators', { count: r.fragile })}</span>
                  <span className="text-faint"> · </span>
                  {t('reports.meta', { total: r.total, files: r.files })}
                  <span className="text-faint"> · </span>
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => openSaved(r.id)} className="text-meta text-muted-foreground hover:text-foreground whitespace-nowrap">{t('report.open')}</button>
              <button onClick={() => setConfirmId(r.id)} title={t('reports.delete')} className="text-muted-foreground hover:text-k-fragile flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      {confirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setConfirmId(null)}>
          <div onClick={e => e.stopPropagation()} className="w-80 max-w-full rounded-lg border border-border bg-card p-5 shadow-lg">
            <p className="text-sub font-medium text-foreground mb-1">{t('reports.deleteConfirmTitle')}</p>
            <p className="text-meta text-muted-foreground mb-4">{t('reports.deleteConfirmDesc')}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmId(null)}
                className="px-3 py-1.5 rounded-md text-meta text-muted-foreground hover:text-foreground transition-colors">{t('close')}</button>
              <button onClick={() => { const id = confirmId; setConfirmId(null); remove(id) }}
                className="px-3 py-1.5 rounded-md text-meta font-medium bg-k-fragile text-white hover:bg-k-fragile/90 transition-colors">{t('reports.delete')}</button>
            </div>
          </div>
        </div>
      )}
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
      <table className="hidden md:table w-full border-collapse table-fixed">
        <thead className="sticky top-0 z-10">
          <tr className="bg-card">
            <th className="px-4 py-2.5 text-left text-label text-muted-foreground border-b border-border border-l-2 border-l-transparent w-[116px]">{t('colKind')}</th>
            <th className="px-4 py-2.5 text-left text-label text-muted-foreground border-b border-border w-[180px] 2xl:w-[220px]">{t('colLocation')}</th>
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
                <td className={`px-4 py-3 border-b border-border/40 border-l-2 ${isSel ? 'border-l-[var(--tool-accent,#22d3ee)]' : 'border-l-transparent'}`}>
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

      <ul className="md:hidden flex flex-col divide-y divide-border/40">
        {rows.map((f, i) => {
          const isSel = selected === f
          const n = dup.get(dupKey(f)) ?? 0
          const s = KIND_STYLE[f.kind]
          return (
            <li key={i}>
              <button onClick={() => onSelect(f)}
                className={`w-full text-left px-4 py-3 flex flex-col gap-1.5 border-l-2 transition-colors ${isSel ? 'bg-muted/60 border-l-[var(--tool-accent,#22d3ee)]' : 'border-l-transparent'}`}>
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${s.dot} flex-shrink-0`} />
                  <span className="text-meta text-muted-foreground">{t(`kinds.${f.kind}.label`)}</span>
                  <span className="text-meta text-faint font-mono ml-auto truncate max-w-[48%]">{f.file}:{f.line}</span>
                </span>
                <span className="flex items-start gap-2 min-w-0">
                  <code className="text-code text-foreground break-all">{selectorText(f)}</code>
                  {n > 1 && (
                    <span className="flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded bg-k-context/15 text-k-context text-meta leading-none whitespace-nowrap">{t('copies', { count: n })}</span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// "How we judge" - an in-place glossary + method sheet. Opened from the results header
// and from the inspector ("Why this verdict?"), so the explanation comes to the user
// instead of yanking them to another tab. Same i18n copy as the About > Method section.
const METHOD_LINKS = {
  pw: <a href="https://playwright.dev/docs/locators" target="_blank" rel="noopener noreferrer" className="text-[var(--tool-accent,#22d3ee)] hover:underline" />,
  tl: <a href="https://testing-library.com/docs/queries/about/#priority" target="_blank" rel="noopener noreferrer" className="text-[var(--tool-accent,#22d3ee)] hover:underline" />,
}

// The full fragility catalogue lives in the repo (open source) - the modal only carries the
// principle; the catalogue is for readers who want every rule.
const RULES_URL = "https://github.com/stackme-io/StackMe/blob/main/packages/locateme/FRAGILITY.md"

// "New audit" as a modal over the current audit - a stray click never destroys what the
// user has been collecting. Only committing a source (folder / sample / paste) replaces it;
// closing leaves the running audit untouched. Same adaptive shell as the Method sheet.
function NewAuditModal({ onClose, onSelectFolder, onSample, onAnalyze, code, setCode, loading }: {
  onClose: () => void
  onSelectFolder: () => void
  onSample: () => void
  onAnalyze: () => void
  code: string
  setCode: (v: string) => void
  loading: boolean
}) {
  const { t } = useTranslation('locate-me')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const btnPrimary = 'px-4 py-2 rounded-md text-sub font-medium bg-[var(--tool-accent,#22d3ee)] text-[#131417] hover:brightness-110 disabled:opacity-50 transition'
  const btnGhost = 'px-3 py-2 rounded-md text-sub font-medium text-foreground border border-border hover:bg-muted hover:border-muted-foreground/40 disabled:opacity-50 transition-colors'

  return (
    <div onClick={onClose}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 sm:px-4 animate-in fade-in-0 duration-200">
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
        className="w-full sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden rounded-t-2xl sm:rounded-xl border-t sm:border border-border bg-card shadow-lg animate-in fade-in-0 slide-in-from-bottom-4 sm:slide-in-from-bottom-2 sm:zoom-in-95 duration-200">
        <div className="flex-shrink-0 border-b border-border px-5 sm:px-6 pt-3 sm:pt-5 pb-3">
          <div className="sm:hidden flex justify-center pb-2"><span className="w-9 h-1 rounded-full bg-border" /></div>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-title text-foreground">{t('newAudit')}</h2>
            <button onClick={onClose} title={t('close')} aria-label={t('close')}
              className="flex items-center justify-center w-8 h-8 -mr-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex-shrink-0">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <button onClick={onSelectFolder} disabled={loading} className={btnPrimary}>{t('selectFolder')}</button>
            <button onClick={onSample} disabled={loading} className={btnGhost}>{t('trySample')}</button>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-label text-muted-foreground">{t('pasteToggle')}</span>
            <textarea value={code} onChange={e => setCode(e.target.value)} placeholder={t('pastePlaceholder')} spellCheck={false}
              className="w-full h-40 bg-muted/30 border border-border rounded-md p-3 text-code text-foreground resize-y focus:outline-none focus:border-[var(--tool-accent,#22d3ee)]" />
            <button onClick={onAnalyze} disabled={loading || !code.trim()} className={`self-start ${btnPrimary}`}>{t('analyze')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MethodModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('locate-me')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div onClick={onClose}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 sm:px-4 animate-in fade-in-0 duration-200">
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
        className="w-full sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden rounded-t-2xl sm:rounded-xl border-t sm:border border-border bg-card shadow-lg animate-in fade-in-0 slide-in-from-bottom-4 sm:slide-in-from-bottom-2 sm:zoom-in-95 duration-200">

        {/* Sticky header - stays put while the body scrolls under it. */}
        <div className="flex-shrink-0 border-b border-border px-5 sm:px-6 pt-3 sm:pt-5 pb-3">
          <div className="sm:hidden flex justify-center pb-2"><span className="w-9 h-1 rounded-full bg-border" /></div>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-title text-foreground">{t('howWeJudge')}</h2>
            <button onClick={onClose} title={t('close')} aria-label={t('close')}
              className="flex items-center justify-center w-8 h-8 -mr-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex-shrink-0">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">

        <div className="flex flex-col gap-4">
          {KIND_ORDER.map(k => (
            <div key={k} className="border-b border-border/40 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${KIND_STYLE[k].dot}`} />
                <span className={`text-heading font-medium ${KIND_STYLE[k].text}`}>{t(`kinds.${k}.label`)}</span>
              </div>
              <p className="text-sub text-muted-foreground leading-relaxed">{t(`explain.${k}`)}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-5 border-t border-border flex flex-col gap-3">
          <h3 className="text-heading text-foreground">{t('aboutMethodTitle')}</h3>
          <p className="text-sub text-muted-foreground leading-relaxed"><Trans t={t} i18nKey="method.p1" components={METHOD_LINKS} /></p>
          <p className="text-sub text-muted-foreground leading-relaxed">{t('method.p2')}</p>
          <p className="text-sub text-muted-foreground leading-relaxed">{t('method.p3')}</p>
          <p className="text-sub text-muted-foreground leading-relaxed">{t('method.p4')}</p>
          <a href={RULES_URL} target="_blank" rel="noopener noreferrer" className="text-sub text-[var(--tool-accent,#22d3ee)] hover:underline self-start">{t('fullRuleList')}</a>
        </div>

        </div>

      </div>
    </div>
  )
}

// Verdict prose (reason / prefer) comes from the engine in English - the core lib is
// i18n-free by design (it also feeds the exportable report). For non-English UIs we
// translate by the stable `subcause` code via the `verdict.*` table, interpolating the
// method name and, for framework-generated ids, the library pulled out of the English
// text. Text buckets get a usage-specific prefer (assert/action) to match applyUsage.
// English (and any unmapped code) falls back to the exact engine wording.
function localizedVerdict(
  finding: Finding,
  t: (key: string, opts?: Record<string, unknown>) => string,
  lang: string,
): { reason: string; prefer?: string } {
  const key = finding.subcause ?? (finding.kind === 'dynamic' ? 'dynamicRuntime' : undefined)
  if (lang.startsWith('en') || !key) return { reason: finding.reason, prefer: finding.prefer }
  const lib = finding.reason.match(/\(([^)]+)\)/)?.[1]
  const opts = { method: finding.method, lib, defaultValue: '' }
  const reason = t(`verdict.${key}.reason`, opts) || finding.reason
  let preferKey = `verdict.${key}.prefer`
  if ((key === 'method-text' || key === 'xpath-text') && (finding.usage === 'assert' || finding.usage === 'action')) {
    preferKey = finding.usage === 'assert' ? 'verdict.textUsageAssert' : 'verdict.textUsageAction'
  }
  const prefer = finding.prefer ? (t(preferKey, opts) || finding.prefer) : finding.prefer
  return { reason, prefer }
}

// Inner inspector content for a selected finding - shared by the desktop side
// panel and the mobile bottom sheet.
function InspectBody({ finding, dupLocations, onClose }: { finding: Finding; dupLocations: string[]; onClose: () => void }) {
  const { t, i18n } = useTranslation('locate-me')
  const { reason: verdictReason, prefer: verdictPrefer } = localizedVerdict(finding, t, i18n.language)
  const [copied, setCopied] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [showCode, setShowCode] = useState(false)

  // Reset transient panel state whenever a different finding is selected.
  useEffect(() => { setShowCode(false); setCopied(false); setCopiedCode(false) }, [finding])

  const copy = () => {
    if (finding.selector === null) return
    navigator.clipboard?.writeText(finding.selector)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
      .catch(() => {})
  }
  const copyCode = () => {
    if (!finding.preferCode) return
    navigator.clipboard?.writeText(finding.preferCode)
      .then(() => { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 1500) })
      .catch(() => {})
  }

  return (
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
              <p className="text-sub text-muted-foreground leading-relaxed">{verdictReason}</p>
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

              {(verdictPrefer || finding.preferCode) && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-k-stable" />
                    <span className="text-label text-k-stable">prefer</span>
                  </div>
                  {verdictPrefer && <p className="text-sub text-content bg-k-stable/10 rounded border-l-2 border-l-k-stable px-3 py-2.5">{verdictPrefer}</p>}
                  {finding.preferCode && (
                    <div className="flex items-stretch gap-2">
                      <code className="flex-1 text-code text-foreground bg-k-stable/10 rounded border-l-2 border-l-k-stable px-3 py-2 break-all">{finding.preferCode}</code>
                      <button onClick={copyCode} className="text-meta text-muted-foreground hover:text-foreground flex-shrink-0 px-1">{copiedCode ? t('copied') : t('copy')}</button>
                    </div>
                  )}
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
  )
}

// Desktop inspector side panel (hidden on mobile - mobile uses a bottom sheet).
function FindingInspect({ finding, dupLocations, onClose }: { finding: Finding | null; dupLocations: string[]; onClose: () => void }) {
  const { t } = useTranslation('locate-me')
  return (
    <div className="hidden md:flex w-[380px] 2xl:w-[440px] flex-shrink-0 border-l border-border flex-col overflow-hidden">
      {!finding ? (
        <>
          <div className="px-4 py-3 border-b border-border">
            <p className="text-label text-muted-foreground">{t('inspector')}</p>
          </div>
          <p className="text-sub text-content px-4 py-4">{t('selectHint')}</p>
        </>
      ) : (
        <InspectBody finding={finding} dupLocations={dupLocations} onClose={onClose} />
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
    { id: 'audit',   label: t('tabs.audit'),   Icon: Anchor },
    { id: 'reports', label: t('tabs.reports'), Icon: Archive },
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
            style={activeTab === id ? { backgroundColor: 'color-mix(in oklab, var(--tool-accent,#22d3ee) 14%, transparent)' } : undefined}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-sub text-left transition-colors ${
              activeTab === id
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}>
            <Icon className="w-3.5 h-3.5 flex-shrink-0" style={activeTab === id ? { color: 'var(--tool-accent,#22d3ee)' } : undefined} />
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
  const [methodOpen, setMethodOpen] = useState(false)
  const [newAuditOpen, setNewAuditOpen] = useState(false)
  const isMobile = useIsMobile()
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
    // Keep the current audit on screen while the new one runs. Only swap on success -
    // a bad input (parse error) then surfaces as an error banner and never drops the
    // user to the empty page, losing the audit they were looking at.
    setLoading(true); setError(null)
    const w = getWorker()
    w.onmessage = (e: MessageEvent<WorkerResult>) => {
      setLoading(false)
      const d = e.data
      if (d.ok && d.report) {
        if (d.report.summary.locatorCalls > 0) {
          setReport(d.report); setDetection(d.detection ?? null); setSource(label); setSelected(null)
        } else {
          // Zero locators is not an audit. Never navigate to a dead "no locators"
          // screen: keep the current audit if there is one, otherwise stay on the
          // empty state, and surface the message inline (banner by the paste box).
          const preserving = !!report && report.summary.locatorCalls > 0
          setError(preserving ? t('noLocatorsKept') : t('noLocators'))
        }
      } else {
        setError(d.error ?? t('analysisFailed'))
      }
    }
    w.postMessage({ files, target })
  }

  const analyzePaste = (text: string) => {
    if (!text.trim()) { setError(t('nothingToAnalyze')); return }
    setSkipped(0)
    // Sniff Java so a pasted Selenium/Java snippet routes to the tree-sitter extractor;
    // the ts-morph path would misparse it. Playwright/Cypress stay .ts.
    const looksJava = /import\s+org\.openqa\.selenium|@FindBy\b|\bpublic\s+class\b|\bBy\.[A-Za-z]/.test(text)
    const path = looksJava ? 'pasted.java' : 'pasted.spec.ts'
    runOnWorker([{ path, text }], 'pasted', t('pastedSnippet'))
  }

  // Open the New Audit modal with a clean paste box - stale code from a previous
  // run shouldn't linger in the textarea.
  const openNewAudit = () => { setCode(''); setNewAuditOpen(true) }

  const runSample = () => {
    setCode(''); setSkipped(0)
    runOnWorker(SAMPLE_FILES, 'sample', t('sampleLabel'))
  }

  const selectFolder = async () => {
    if (!supportsFolderPicker()) { setError(t('needChromium')); return }
    setError(null); setLoading(true)
    try {
      const { files, rootName, skipped: skippedCount } = await pickAndReadFolder()
      if (files.length === 0) { setLoading(false); setError(t('noTsFiles', { name: rootName })); return }
      setSkipped(skippedCount)
      runOnWorker(files, rootName, rootName)
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

  // "Why this verdict?" / "How we judge": open the glossary+method sheet in place - the
  // explanation comes to the user, no tab switch, no lost audit context.
  const showMethod = () => setMethodOpen(true)

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
  // Variant B: the headline count, ratio bar and "Showing X of Y" reflect the included
  // (checked) files; the "Your file" source line stays fixed. Kind chips are a view filter.
  const visibleFindings = findings.filter(f => !fileExcluded.has(f.file))
  const visByKind: Record<Kind, number> = { fragile: 0, stable: 0, context: 0, dynamic: 0 }
  for (const f of visibleFindings) visByKind[f.kind]++
  const visCalls = visibleFindings.length
  const visFiles = fileList.filter(f => !fileExcluded.has(f)).length
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
    // Desktop keeps a row selected for the side panel; mobile opens the sheet only on tap.
    setSelected(isMobile ? null : (rows[0] ?? null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, filterKinds, sortMode, fileExcluded, isMobile])

  const btnPrimary = 'px-4 py-2 rounded-md text-sub font-medium bg-[var(--tool-accent,#22d3ee)] text-[#131417] hover:brightness-110 disabled:opacity-50 transition'
  const btnGhost = 'px-3 py-2 rounded-md text-sub font-medium text-foreground border border-border hover:bg-muted hover:border-muted-foreground/40 disabled:opacity-50 transition-colors'

  return (
    <div className="flex h-full relative overflow-hidden">

      <aside
        className="hidden md:block flex-shrink-0 border-r border-border overflow-hidden transition-all duration-200"
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
        {/* ---- Mobile sub-nav (replaces the desktop rail nav) ---- */}
        <div className="md:hidden flex items-center gap-1 px-3 py-2 border-b border-border/60 overflow-x-auto flex-shrink-0">
          {([['audit', Anchor], ['reports', Archive], ['roadmap', Route], ['about', Info]] as const).map(([id, Icon]) => (
            <button key={id} onClick={() => navTo(id)}
              style={activeTab === id ? { backgroundColor: 'color-mix(in oklab, var(--tool-accent,#22d3ee) 14%, transparent)', borderColor: 'color-mix(in oklab, var(--tool-accent,#22d3ee) 45%, transparent)' } : undefined}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md border text-meta whitespace-nowrap flex-shrink-0 transition-colors ${activeTab === id ? 'text-foreground font-medium' : 'border-border/50 text-muted-foreground'}`}>
              <Icon className="w-3 h-3 flex-shrink-0" style={activeTab === id ? { color: 'var(--tool-accent,#22d3ee)' } : undefined} />
              {t(`tabs.${id}`)}
            </button>
          ))}
        </div>

        {/* ---- AUDIT (height-locked: only the table scrolls) ---- */}
        <div
          style={{ display: activeTab === 'audit' ? 'flex' : 'none' }}
          className="flex-1 min-h-0 flex-col px-4 md:px-6 xl:px-10 2xl:px-14 pt-5 gap-4"
        >
          {!report ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-7 px-4 relative">

              <div className="flex justify-center relative">
                <div className="text-center flex-shrink-0 max-w-full relative -mt-3">

                  {hintsOpen && (
                    <div className="hidden lg:flex items-center gap-3 absolute top-1/2 -translate-y-1/2 right-full mr-6 text-left w-max">
                      <div className="flex flex-col gap-3.5 items-start whitespace-nowrap" style={{ fontFamily: "'Neucha', cursive" }}>
                        <span className="text-[18px] text-muted-foreground ml-1 -mb-2">{t('giveLead')}</span>
                        <div className="text-[20px] leading-tight text-foreground border border-muted-foreground/45 rounded-[14px] px-3 py-2 flex flex-col gap-1">
                          {(t('giveStacks', { returnObjects: true }) as string[]).map(s => (
                            <span key={s} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 flex-shrink-0" />{s}
                            </span>
                          ))}
                        </div>
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
                    <p className="text-heading text-foreground mb-1 max-w-[300px] mx-auto text-balance">{t('emptyTitle')}</p>
                    <p className="text-sub text-content max-w-[280px] mx-auto">{t('emptyDesc')}</p>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={selectFolder} disabled={loading} className={btnPrimary}>{t('selectFolder')}</button>
                    <button onClick={runSample} disabled={loading} className={btnGhost}>{t('trySample')}</button>
                  </div>
                  <p className="md:hidden text-meta text-muted-foreground/90 mt-3 max-w-[280px] mx-auto">{t('mobileHint')}</p>
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

              <div className="w-full max-w-sm flex flex-col gap-3">
                <details className="border-2 border-border rounded-md">
                  <summary className="px-3 py-2 cursor-pointer text-sub text-muted-foreground hover:text-foreground list-none text-center">{t('pasteToggle')}</summary>
                  <div className="p-3 pt-0 flex flex-col gap-2">
                    <textarea value={code} onChange={e => setCode(e.target.value)} placeholder={t('pastePlaceholder')} spellCheck={false}
                      className="w-full h-40 bg-muted/30 border border-border rounded-md p-3 text-code text-foreground resize-y focus:outline-none focus:border-[var(--tool-accent,#22d3ee)]" />
                    <button onClick={() => analyzePaste(code)} disabled={loading} className={`self-start ${btnPrimary}`}>{t('analyze')}</button>
                  </div>
                </details>
                {error && <p className="text-meta text-amber-400/90 border border-amber-400/30 rounded-md px-3 py-2">{error}</p>}
              </div>
            </div>
          ) : (
            <>
              {error && <p className="text-meta text-amber-400/90 border border-amber-400/30 rounded-md px-3 py-2 max-w-3xl flex-shrink-0">{error}</p>}

              <div className="flex-shrink-0"><Headline detection={detection} source={source} calls={visCalls} files={visFiles}
                    action={
                      <div className="flex items-center gap-2">
                        {loading && <span className="text-meta text-muted-foreground animate-pulse">{t('analyzing')}</span>}
                        <button onClick={openNewAudit} disabled={loading}
                          className="px-2.5 py-1 rounded-md text-sub text-muted-foreground border border-border hover:text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors">
                          {t('newAudit')}
                        </button>
                        <button onClick={selectFolder} disabled={loading}
                          className="px-2.5 py-1 rounded-md text-sub text-muted-foreground border border-border hover:text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors">
                          {t('selectFolder')}
                        </button>
                        <ReportButton report={report} fileExcluded={fileExcluded} source={source} />
                      </div>
                    } /></div>
                  {skipped > 0 && (
                    <p className="text-meta text-muted-foreground/80 flex-shrink-0 -mt-2" title={t('skippedTip')}>{t('skippedFiles', { count: skipped })}</p>
                  )}
                  {report?.summary.unresolvedBases?.length ? (
                    <p className="text-meta text-amber-400/90 flex-shrink-0 -mt-2" title={t('unresolvedBasesTip')}>
                      {t('unresolvedBases', { list: report.summary.unresolvedBases.map(u => `${u.className} → ${u.base}`).join(', ') })}
                    </p>
                  ) : null}
                  {report?.summary.unparsed ? (
                    <p className="text-meta text-amber-400/90 flex-shrink-0 -mt-2" title={t('unparsedTip')}>
                      {t('unparsed', { count: report.summary.unparsed })}
                    </p>
                  ) : null}
                  <div className="flex-shrink-0"><RatioBar byKind={visByKind} filterKinds={filterKinds} onToggle={toggleFilter} /></div>

                  {rows.length === 0 ? (
                    <p className="text-sub text-content">{t('noneForFilter')}</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3 flex-shrink-0 -mb-1">
                        <p className="text-meta text-muted-foreground">{t('showingOf', { shown: rows.length, total: visCalls })}</p>
                        <button onClick={showMethod}
                          className="text-meta text-muted-foreground/80 hover:text-foreground underline decoration-dotted underline-offset-2 flex-shrink-0">
                          {t('howWeJudge')}
                        </button>
                      </div>
                      <div className="flex-1 min-h-0 flex rounded-lg border border-border overflow-hidden">
                        <FindingsTable rows={rows} dup={dup} selected={selected} onSelect={setSelected} />
                        <FindingInspect finding={selected} dupLocations={selDupLocations} onClose={() => setSelected(null)} />
                      </div>

                      {/* Mobile inspector - bottom sheet on tap (desktop uses the side panel above) */}
                      {selected && (
                        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setSelected(null)}>
                          <div className="absolute inset-0 bg-black/40" />
                          <div onClick={e => e.stopPropagation()} className="relative bg-card border-t border-border rounded-t-2xl max-h-[80vh] flex flex-col overflow-hidden">
                            <div className="flex justify-center pt-2 pb-1 flex-shrink-0"><span className="w-9 h-1 rounded-full bg-border" /></div>
                            <InspectBody finding={selected} dupLocations={selDupLocations} onClose={() => setSelected(null)} />
                          </div>
                        </div>
                      )}
                    </>
                  )}

            </>
          )}
        </div>

        {/* ---- REPORTS (saved) ---- */}
        <div style={{ display: activeTab === 'reports' ? 'block' : 'none' }} className="flex-1 overflow-y-auto px-4 md:px-6 pt-5">
          {activeTab === 'reports' && <SavedReports />}
        </div>

        {/* ---- ROADMAP ---- */}
        <div style={{ display: activeTab === 'roadmap' ? 'block' : 'none' }} className="flex-1 overflow-y-auto px-4 md:px-6 pt-5">
          <h2 className="text-title text-foreground mb-4">{t('roadmapTitle')}</h2>
          <RoadmapTab namespace="locate-me" />
        </div>

        {/* ---- ABOUT ---- */}
        <div style={{ display: activeTab === 'about' ? 'block' : 'none' }} className="flex-1 overflow-y-auto px-4 md:px-6 pt-5">
          <div className="max-w-2xl flex flex-col gap-4 text-body leading-relaxed text-content">
            <h2 className="text-title text-foreground">{t('aboutTitle')}</h2>
            <p><Trans t={t} i18nKey="about.p1" components={{ b: <strong className="font-medium text-foreground" /> }} /></p>
            <p><Trans t={t} i18nKey="about.p2" components={{ b: <strong className="font-medium text-foreground" /> }} /></p>
            <p><Trans t={t} i18nKey="about.p4" components={{ b: <strong className="font-medium text-foreground" /> }} /></p>
            <p className="text-foreground font-medium border-l-2 border-l-border bg-muted/30 rounded-r px-3.5 py-2.5">{t('about.precision')}</p>
            <p className="border-t border-border/50 pt-4 mt-1"><Trans t={t} i18nKey="about.p3" components={{ b: <strong className="font-medium text-foreground" /> }} /></p>

            <div id="locate-method" className="border-t border-border/50 pt-5 mt-2 flex flex-col gap-4 scroll-mt-4">
              <h3 className="text-heading text-foreground">{t('aboutMethodTitle')}</h3>
              <p><Trans t={t} i18nKey="method.p1" components={METHOD_LINKS} /></p>
              <p>{t('method.p2')}</p>
              <p>{t('method.p3')}</p>
              <p>{t('method.p4')}</p>
              <a href={RULES_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--tool-accent,#22d3ee)] hover:underline self-start">{t('fullRuleList')}</a>
            </div>
          </div>
        </div>

        {methodOpen && <MethodModal onClose={() => setMethodOpen(false)} />}
        {newAuditOpen && (
          <NewAuditModal
            onClose={() => setNewAuditOpen(false)}
            onSelectFolder={() => { setNewAuditOpen(false); selectFolder() }}
            onSample={() => { setNewAuditOpen(false); runSample() }}
            onAnalyze={() => { setNewAuditOpen(false); analyzePaste(code) }}
            code={code}
            setCode={setCode}
            loading={loading}
          />
        )}

        {/* Trust badges belong to the pre-audit pitch. Once results are on screen the
            user has already lived them - persuading the convinced is just noise. */}
        {!report && (
          <div className="border-t border-border/50 flex-shrink-0 px-4 md:px-6 py-2 flex flex-col gap-1">
            <p className="text-meta text-muted-foreground">{t('emptyPromise')}</p>
            <div className="flex items-center gap-3 md:gap-5 overflow-x-auto">
              {(t('badges', { returnObjects: true }) as string[]).map(item => (
                <span key={item} className="text-meta text-muted-foreground whitespace-nowrap flex-shrink-0">
                  <span className="mr-1 text-faint">//</span>{item}
                </span>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
