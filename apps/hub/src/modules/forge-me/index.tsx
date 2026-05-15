import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ModuleTabs } from '../../shared/ModuleTabs'
import { GenerateSection } from './GenerateSection'
import { SchemaSection } from './SchemaSection'
import type { ParsedField } from './SchemaSection'
import type { AnomalyType, HistoryEntry, ViewMode } from './types'

const ANOMALIES: { id: AnomalyType; label: string; badge: string; disabled?: boolean }[] = [
  { id: 'nulls',            label: 'nulls',           badge: 'any'    },
  { id: 'duplicates',       label: 'duplicates',       badge: 'any'    },
  { id: 'outliers',         label: 'outliers',         badge: 'any'    },
  { id: 'out-of-order',     label: 'out-of-order',     badge: 'soon',  disabled: true },
  { id: 'late-arrivals',    label: 'late arrivals',    badge: 'soon',  disabled: true },
  { id: 'type-mismatches',  label: 'type mismatches',  badge: 'soon',  disabled: true },
  { id: 'stale-timestamps', label: 'stale timestamps', badge: 'soon',  disabled: true },
]

const STARTER: AnomalyType[] = ['nulls', 'duplicates', 'outliers']
const CHAOS: AnomalyType[]   = ANOMALIES.filter(a => !a.disabled).map(a => a.id)

export default function ForgeMePage() {
  const [activeTab, setActiveTab]       = useState('work')
  const [sidebarOpen, setSidebarOpen]   = useState(true)
  const [viewMode, setViewMode]         = useState<ViewMode>('raw')
  const [selected, setSelected]         = useState<Set<AnomalyType>>(new Set(STARTER))
  const [preset, setPreset]             = useState<'starter' | 'chaos' | null>('starter')
  const [seed, setSeed]                 = useState(42)
  const [rows, setRows]                 = useState(100)
  const [anomalyRate, setAnomalyRate]   = useState(0.05)
  const [history, setHistory]           = useState<HistoryEntry[]>([])
  const [schemaFields, setSchemaFields] = useState<ParsedField[]>([])
  const { t } = useTranslation('forge-me')

  const toggleAnomaly = useCallback((id: AnomalyType) => {
    const anomaly = ANOMALIES.find(a => a.id === id)
    if (anomaly?.disabled) return
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setPreset(null)
  }, [])

  const applyPreset = useCallback((p: 'starter' | 'chaos') => {
    setSelected(new Set(p === 'starter' ? STARTER : CHAOS))
    setPreset(p)
  }, [])

  const ratePreview = useMemo(() => {
    if (selected.size === 0) return []
    const total = Math.round(rows * anomalyRate)
    const per   = Math.round(total / selected.size)
    return [...selected].map(type => ({ type, count: per }))
  }, [selected, rows, anomalyRate])

  const handleGenerated = useCallback((entry: HistoryEntry) => {
    setHistory(prev => [entry, ...prev].slice(0, 10))
  }, [])

  return (
    <div className="flex h-full relative overflow-hidden">

      <aside
        className="flex-shrink-0 border-r border-border overflow-hidden transition-all duration-200"
        style={{ width: sidebarOpen ? '208px' : '0px' }}
      >
        <div className="w-[208px] h-full flex flex-col overflow-hidden">

          {/* Anomaly mix */}
          <div className="p-3 pb-2 border-b border-border">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">
              Anomaly mix
            </p>
            <div className="flex flex-col gap-0.5">
              {ANOMALIES.map(a => (
                <button
                  key={a.id}
                  onClick={() => toggleAnomaly(a.id)}
                  disabled={a.disabled}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                    a.disabled
                      ? 'opacity-35 cursor-not-allowed'
                      : selected.has(a.id)
                      ? 'bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center ${
                    !a.disabled && selected.has(a.id) ? 'bg-primary border-primary' : 'border-border'
                  }`}>
                    {!a.disabled && selected.has(a.id) && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    )}
                  </span>
                  <span className="text-xs flex-1">{a.label}</span>
                  <span className={`text-[9px] ${a.disabled ? 'text-primary/40' : 'text-muted-foreground/50'}`}>
                    {a.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Presets */}
          <div className="p-3 pb-2 border-b border-border">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">
              Presets
            </p>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => applyPreset('starter')}
                className={`px-2 py-1.5 rounded-md text-xs text-left border transition-colors ${
                  preset === 'starter'
                    ? 'border-primary/50 bg-primary/10 text-foreground'
                    : 'border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/30'
                }`}
              >
                Starter
              </button>
              <button
                disabled
                className="px-2 py-1.5 rounded-md text-xs text-left border border-border text-muted-foreground/40 opacity-50 cursor-not-allowed flex items-center justify-between"
              >
                <span>Full chaos</span>
                <span className="text-[9px] text-primary/40">soon</span>
              </button>
            </div>
          </div>

          {/* Mode — п.1 */}
          <div className="p-3 pb-2 border-b border-border">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">
              Mode
            </p>
            <div className="flex flex-col gap-1.5">
              {(['raw', 'schema'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2 py-1.5 rounded-md text-xs text-left border transition-colors ${
                    viewMode === mode
                      ? 'border-primary/50 bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/30'
                  }`}
                >
                  {mode === 'raw' ? 'Raw generator' : 'Schema match'}
                </button>
              ))}
            </div>
          </div>

          {/* History */}
          <div className="p-3 flex-1 overflow-y-auto">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">
              History
            </p>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground/40">Nothing generated yet. Curious?</p>
            ) : (
              <div className="flex flex-col gap-2">
                {history.map((h, i) => (
                  <div key={i} className="border-b border-border/50 pb-2">
                    <p className="text-xs text-muted-foreground">
                      {h.rows} rows · {Math.round(h.rate * 100)}% · {h.format.toUpperCase()}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                      {h.anomalies.slice(0, 3).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
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
              { id: 'work',  label: 'Work'  },
              { id: 'about', label: 'About' },
              { id: 'stack', label: 'Stack' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            moduleId="forge-me"
          />

          {activeTab === 'work' && (
            <>
              {ratePreview.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {ratePreview.map(r => (
                    <span
                      key={r.type}
                      className="text-[10px] px-2 py-0.5 rounded border border-border bg-muted/30 text-muted-foreground"
                    >
                      {r.count} {r.type}
                    </span>
                  ))}
                </div>
              )}

              {viewMode === 'raw' ? (
                <GenerateSection
                  selectedAnomalies={selected}
                  seed={seed}
                  rows={rows}
                  anomalyRate={anomalyRate}
                  onSeedChange={setSeed}
                  onRowsChange={setRows}
                  onAnomalyRateChange={setAnomalyRate}
                  onGenerated={handleGenerated}
                />
              ) : (
                <>
                  <SchemaSection onSchemaReady={setSchemaFields} />
                  <GenerateSection
                    selectedAnomalies={selected}
                    seed={seed}
                    rows={rows}
                    anomalyRate={anomalyRate}
                    onSeedChange={setSeed}
                    onRowsChange={setRows}
                    onAnomalyRateChange={setAnomalyRate}
                    onGenerated={handleGenerated}
                    schemaFields={schemaFields}
                  />
                </>
              )}
            </>
          )}

          {activeTab === 'about' && (
            <div className="max-w-xl">
              <h2 className="text-sm font-medium text-foreground mb-1">{t('title')}</h2>
              <p className="text-xs text-muted-foreground mb-4">{t('version')}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">{t('description')}</p>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-2">
                {t('whatsnextLabel')}
              </p>
              <div className="flex flex-col gap-1.5 mb-6">
                {(t('whatsnext', { returnObjects: true }) as string[]).map(f => (
                  <div key={f} className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">{f}</span>
                    <button className="text-[10px] text-muted-foreground/50 hover:text-foreground transition-colors">
                      + vote
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'stack' && (
            <div className="max-w-xl">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-3">
                {t('technologiesLabel')}
              </p>
              <div className="flex flex-col gap-1.5 mb-6">
                {(t('items', { returnObjects: true }) as { name: string; license: string; desc: string }[]).map(item => (
                  <div key={item.name} className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <div>
                      <span className="text-xs text-foreground">{item.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{item.desc}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/50">{item.license}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/stackme-io/StackMe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('github')}
                </a>
                <span className="text-xs text-muted-foreground/40">{t('badge')}</span>
              </div>
            </div>
          )}

        </div>

        <div className="h-8 border-t border-border/50 flex items-center px-6 gap-5 flex-shrink-0">
          {(t('badges', { returnObjects: true }) as string[]).map(item => (
            <span key={item} className="text-[10px] text-muted-foreground/60">
              <span className="mr-1 text-muted-foreground/40">//</span>{item}
            </span>
          ))}
        </div>

      </main>
    </div>
  )
}
