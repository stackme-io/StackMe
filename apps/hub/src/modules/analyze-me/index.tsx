import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAnalyze } from './useAnalyze'
import { AnalyzeSection } from './AnalyzeSection'
import { AnalyzeSidebar, SENSITIVITY_MULTIPLIER, type Sensitivity } from './AnalyzeSidebar'
import { ModuleTabs } from '../../shared/ModuleTabs'
import { popHandoff, onHandoff, type ForgeHandoff } from '../../shared/forgeHandoff'

type FilterType = 'all' | 'anomalies' | 'missing' | 'duplicate' | 'outlier' | 'missed' | 'false_positive'

const TABS = [
  { id: 'work',  label: 'Work'  },
  { id: 'about', label: 'About' },
  { id: 'stack', label: 'Stack' },
]

export default function AnalyzeMePage() {
  const { result, tableData, loading, progress, sizeWarn, error, fileName, analyze } = useAnalyze()
  const { t } = useTranslation('analyze-me')
  const [activeTab, setActiveTab]     = useState('work')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [filter, setFilter]           = useState<FilterType>('all')
  const [sensitivity, setSensitivity] = useState<Sensitivity>('balanced')
  const [forgeData, setForgeData]     = useState<ForgeHandoff | null>(null)

  const analyzeRef     = useRef(analyze)
  const fileRef        = useRef<File | null>(null)
  const sensitivityRef = useRef(sensitivity)
  useEffect(() => { analyzeRef.current = analyze }, [analyze])
  useEffect(() => { sensitivityRef.current = sensitivity }, [sensitivity])

  useEffect(() => {
    function consume(handoff: ForgeHandoff) {
      setForgeData(handoff)
      setFilter('all')
      const json = JSON.stringify(handoff.rows)
      const file = new File([json], `forgeme-${handoff.seed}.json`, { type: 'application/json' })
      fileRef.current = file
      analyzeRef.current(file, SENSITIVITY_MULTIPLIER[sensitivityRef.current])
    }

    const immediate = popHandoff()
    if (immediate) { consume(immediate); return }

    return onHandoff(() => {
      const h = popHandoff()
      if (h) consume(h)
    })
  }, [])

  const handleFile = (file: File) => {
    fileRef.current = file
    setForgeData(null)
    setFilter('all')
    analyze(file, SENSITIVITY_MULTIPLIER[sensitivity])
  }

  const handleSensitivityChange = (s: Sensitivity) => {
    setSensitivity(s)
    if (fileRef.current) analyze(fileRef.current, SENSITIVITY_MULTIPLIER[s])
  }

  const detectedSet = new Set(result?.anomalies.map(a => a.row_index) ?? [])
  const injectedSet = new Set(forgeData?.anomalies.map(a => a.row_index) ?? [])

  const verdictCounts = forgeData && result ? {
    detected:       [...injectedSet].filter(idx => detectedSet.has(idx)).length,
    missed:         [...injectedSet].filter(idx => !detectedSet.has(idx)).length,
    false_positive: [...detectedSet].filter(idx => !injectedSet.has(idx)).length,
  } : null

  return (
    <div className="flex h-full relative overflow-hidden">

      <aside
        className="flex-shrink-0 border-r border-border overflow-hidden transition-all duration-200"
        style={{ width: sidebarOpen ? '208px' : '0px' }}
      >
        <AnalyzeSidebar
          result={result}
          sensitivity={sensitivity}
          onSensitivityChange={handleSensitivityChange}
        />
      </aside>

      <button
        onClick={() => setSidebarOpen(o => !o)}
        className="absolute top-1/2 -translate-y-1/2 z-10 w-3.5 h-9 flex items-center justify-center bg-background border border-border rounded-r-md text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-all"
        style={{ left: sidebarOpen ? '208px' : '0px' }}
      >
        <span className="text-[10px]">{sidebarOpen ? '‹' : '›'}</span>
      </button>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 overflow-y-auto px-6 pt-5">
          <ModuleTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

          <div style={{ display: activeTab === 'work' ? 'block' : 'none' }}>
            <AnalyzeSection
              result={result}
              tableData={tableData}
              loading={loading}
              progress={progress}
              sizeWarn={sizeWarn}
              error={error}
              fileName={fileName}
              filter={filter}
              forgeData={forgeData}
              verdictCounts={verdictCounts}
              onFile={handleFile}
              onFilter={setFilter}
            />
          </div>

          <div style={{ display: activeTab === 'about' ? 'block' : 'none' }}>
            <div className="max-w-xl">
              <h2 className="text-sm font-medium text-foreground mb-1">{t('title')}</h2>
              <p className="text-xs text-muted-foreground mb-4">{t('version')}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">{t('description')}</p>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 mb-2">
                {t('whatsnextLabel')}
              </p>
              <div className="flex flex-col gap-1.5 mb-6">
                {(t('whatsnext', { returnObjects: true }) as string[]).map(f => (
                  <div key={f} className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-xs text-muted-foreground/70">{f}</span>
                    <button className="text-[10px] text-muted-foreground/70 hover:text-foreground transition-colors">
                      + vote
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: activeTab === 'stack' ? 'block' : 'none' }}>
            <div className="max-w-xl">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 mb-3">
                {t('technologiesLabel')}
              </p>
              <div className="flex flex-col gap-1.5 mb-6">
                {(t('items', { returnObjects: true }) as { name: string; license: string; desc: string }[]).map(item => (
                  <div key={item.name} className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <div>
                      <span className="text-xs text-foreground">{item.name}</span>
                      <span className="text-xs text-muted-foreground/70 ml-2">{item.desc}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/70">{item.license}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/stackme-io/StackMe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  {t('github')}
                </a>
                <span className="text-xs text-muted-foreground/70">{t('badge')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="h-8 border-t border-border/50 flex items-center px-6 gap-5 flex-shrink-0">
          {(t('badges', { returnObjects: true }) as string[]).map(item => (
            <span key={item} className="text-[10px] text-muted-foreground/70">
              <span className="mr-1 text-muted-foreground/40">//</span>{item}
            </span>
          ))}
        </div>
      </main>

    </div>
  )
}