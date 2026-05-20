import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ModuleTabs } from '../../shared/ModuleTabs'
import { Sidebar } from './Sidebar'
import { GenerateSection } from './GenerateSection'
import { SchemaSection } from './SchemaSection'
import type { ParsedField } from './SchemaSection'
import type { AnomalyType, ViewMode } from './types'

const DEFAULT_SELECTED: AnomalyType[] = ['nulls', 'duplicates', 'outliers']

export default function ForgeMePage() {
  const [activeTab, setActiveTab]       = useState('generate')
  const [sidebarOpen, setSidebarOpen]   = useState(true)
  const [viewMode, setViewMode]         = useState<ViewMode>('raw')
  const [selected, setSelected]         = useState<Set<AnomalyType>>(new Set(DEFAULT_SELECTED))
  const [seed, setSeed]                 = useState(42)
  const [rows, setRows]                 = useState(100)
  const [anomalyRate, setAnomalyRate]   = useState(0.05)
  const [schemaFields, setSchemaFields] = useState<ParsedField[]>([])
  const { t } = useTranslation('forge-me')

  const toggleAnomaly = useCallback((id: AnomalyType) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const ratePreview = useMemo(() => {
    if (selected.size === 0) return []
    const total = Math.round(rows * anomalyRate)
    const per   = Math.round(total / selected.size)
    return [...selected].map(type => ({ type, count: per }))
  }, [selected, rows, anomalyRate])

  return (
    <div className="flex h-full relative overflow-hidden">

      <aside
        className="flex-shrink-0 border-r border-border overflow-hidden transition-all duration-200"
        style={{ width: sidebarOpen ? '208px' : '0px' }}
      >
        <Sidebar
          selected={selected}
          onToggle={toggleAnomaly}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
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
              { id: 'generate', label: 'Generate' },
              { id: 'roadmap',  label: 'Roadmap'  },
              { id: 'stack',    label: 'Stack'     },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === 'generate' && (
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
                  onGenerated={() => {}}
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
                    onGenerated={() => {}}
                    schemaFields={schemaFields}
                  />
                </>
              )}
            </>
          )}

          {activeTab === 'roadmap' && (
            <div className="max-w-xl">
              <h2 className="text-sm font-medium text-foreground mb-1">{t('title')}</h2>
              <p className="text-xs text-muted-foreground mb-6">{t('description')}</p>

              {(['done', 'next', 'later'] as const).map(section => (
                <div key={section} className="mb-6">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-2">
                    {t(`${section}Label`)}
                  </p>
                  <div className="flex flex-col">
                    {(t(section, { returnObjects: true }) as { title: string; desc: string }[]).map(item => (
                      <div key={item.title} className="flex items-start justify-between py-2 border-b border-border/50">
                        <div>
                          <p className="text-xs text-foreground">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground/50 mt-0.5">{item.desc}</p>
                        </div>
                        {section === 'next' && (
                          <button className="text-[10px] text-muted-foreground/40 hover:text-foreground transition-colors ml-4 mt-0.5 flex-shrink-0">
                            + vote
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="mt-8">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-3">
                  {t('suggestLabel')}
                </p>
                <textarea
                  maxLength={300}
                  placeholder={t('suggestPlaceholder')}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={3}
                />
                <div className="flex items-center justify-between mt-2">
                  <label className="flex items-center gap-2 text-[10px] text-muted-foreground/50 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded" />
                    {t('suggestUsernameLabel')}
                  </label>
                  <p className="text-[10px] text-muted-foreground/40">{t('suggestHint')}</p>
                </div>
                <button className="mt-3 px-4 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                  {t('suggestSubmit')}
                </button>
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
                <a href="https://github.com/stackme-io/StackMe" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {t('github')}
                </a>
                <span className="text-xs text-muted-foreground/40">{t('badge')}</span>
              </div>
            </div>
          )}

        </div>

        <div className="h-8 border-t border-border/50 flex items-center px-6 gap-5 flex-shrink-0">
          {(t('badges', { returnObjects: true }) as string[]).map(item => (
            <span key={item} className="text-[10px] text-muted-foreground/75">
              <span className="mr-1 text-muted-foreground/40">//</span>{item}
            </span>
          ))}
        </div>

      </main>
    </div>
  )
}