import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAnalyze } from './useAnalyze'
import { RoadmapTab } from '../../shared/RoadmapTab'
import { OnboardingFlow } from '../../shared/OnboardingFlow'
import { AnalyzeSection } from './AnalyzeSection'
import { AnalyzeSidebar, getMultiplier, type Sensitivity } from './AnalyzeSidebar'
import { ModuleTabs } from '../../shared/ModuleTabs'
import { SecurityTab } from './SecurityTab'
import { popHandoff, onHandoff, type ForgeHandoff } from '../../shared/forgeHandoff'

const VALID_TABS = ['work', 'about', 'stack', 'security']

type FilterType = 'all' | 'anomalies' | 'missing' | 'duplicate' | 'outlier' | 'missed' | 'false_positive'

const HINT_KEY = 'stackme-hint-analyze-me'

export default function AnalyzeMePage() {
  const { result, tableData, loading, progress, sizeWarn, error, fileName, analyze } = useAnalyze()
  const { t } = useTranslation('analyze-me')
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab]         = useState(() => {
    const tab = searchParams.get('tab')
    return tab && VALID_TABS.includes(tab) ? tab : 'work'
  })

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && VALID_TABS.includes(tab)) setActiveTab(tab)
  }, [searchParams])

  useEffect(() => {
    if (activeTab === 'security') setSidebarOpen(false)
    else setSidebarOpen(true)
  }, [activeTab])
  const [sidebarOpen, setSidebarOpen]     = useState(true)
  const [filter, setFilter]               = useState<FilterType>('all')
  const [sensitivity, setSensitivity]       = useState<Sensitivity>('balanced')
  const [customMultiplier, setCustomMultiplier] = useState(2.0)
  const [forgeData, setForgeData]           = useState<ForgeHandoff | null>(null)
  const [hintPermanent, setHintPermanent] = useState(() => !!localStorage.getItem(HINT_KEY))
  const [hintVisible, setHintVisible]     = useState(true)

  const analyzeRef          = useRef(analyze)
  const fileRef             = useRef<File | null>(null)
  const sensitivityRef      = useRef(sensitivity)
  const customMultiplierRef = useRef(customMultiplier)
  useEffect(() => { analyzeRef.current = analyze }, [analyze])
  useEffect(() => { sensitivityRef.current = sensitivity }, [sensitivity])
  useEffect(() => { customMultiplierRef.current = customMultiplier }, [customMultiplier])

  useEffect(() => {
    function consume(handoff: ForgeHandoff) {
      setForgeData(handoff)
      setFilter('all')
      const json = JSON.stringify(handoff.rows)
      const file = new File([json], `forgeme-${handoff.seed}.json`, { type: 'application/json' })
      fileRef.current = file
      analyzeRef.current(file, getMultiplier(sensitivityRef.current, customMultiplierRef.current))
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
    analyze(file, getMultiplier(sensitivity, customMultiplier))
  }

  const handleSensitivityChange = (s: Sensitivity) => {
    setSensitivity(s)
    if (fileRef.current) analyze(fileRef.current, getMultiplier(s, customMultiplierRef.current))
  }

  const handleCustomMultiplierChange = (v: number) => {
    setCustomMultiplier(v)
    customMultiplierRef.current = v
    if (fileRef.current) analyze(fileRef.current, v)
  }

  const handleHidePermanent = () => {
    localStorage.setItem(HINT_KEY, '1')
    setHintPermanent(true)
    setHintVisible(false)
  }

  const handleShowHint = () => {
    localStorage.removeItem(HINT_KEY)
    setHintPermanent(false)
    setHintVisible(true)
  }

  const detectedSet = new Set(result?.anomalies.map(a => a.row_index) ?? [])
  const injectedSet = new Set(forgeData?.anomalies.map(a => a.row_index) ?? [])

  const verdictCounts = forgeData && result ? {
    detected:       [...injectedSet].filter(idx => detectedSet.has(idx)).length,
    missed:         [...injectedSet].filter(idx => !detectedSet.has(idx)).length,
    false_positive: [...detectedSet].filter(idx => !injectedSet.has(idx)).length,
  } : null

  const hintSteps = [
    { title: t('hint1Title'), desc: t('hint1Desc') },
    { title: t('hint2Title'), desc: t('hint2Desc') },
    { title: t('hint3Title'), desc: t('hint3Desc') },
  ]

  return (
    <div className="flex h-full relative overflow-hidden">

      <aside
        data-no-print
        className="flex-shrink-0 border-r border-border overflow-hidden transition-all duration-200"
        style={{ width: sidebarOpen ? '208px' : '0px' }}
      >
        <AnalyzeSidebar
          result={result}
          sensitivity={sensitivity}
          onSensitivityChange={handleSensitivityChange}
          customMultiplier={customMultiplier}
          onCustomMultiplierChange={handleCustomMultiplierChange}
        />
      </aside>

      {activeTab !== 'security' && (
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="absolute top-1/2 -translate-y-1/2 z-10 w-3.5 h-9 flex items-center justify-center bg-background border border-border rounded-r-md text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-all"
          style={{ left: sidebarOpen ? '208px' : '0px' }}
        >
          <span className="text-[10px]">{sidebarOpen ? '‹' : '›'}</span>
        </button>
      )}

      <main className="flex-1 flex flex-col overflow-hidden min-w-0 transition-colors duration-300">
        <div
          className={`flex-1 overflow-y-auto ${activeTab === 'security' ? '' : 'px-6 pt-5'}`}
        >
          <div data-no-print className={activeTab === 'security' ? 'px-6 pt-5' : ''}>
            <ModuleTabs
              tabs={[
                { id: 'work',     label: t('tabs.work')     },
                { id: 'about',    label: t('tabs.roadmap')  },
                { id: 'stack',    label: t('tabs.stack')    },
                { id: 'security', label: t('tabs.security') },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
              onShowHint={hintPermanent || !hintVisible ? handleShowHint : undefined}
            />
          </div>

          <div style={{ display: activeTab === 'work' ? 'block' : 'none' }}>
            <OnboardingFlow
              steps={hintSteps}
              visible={!hintPermanent && hintVisible}
              onHideSession={() => setHintVisible(false)}
              onHidePermanent={handleHidePermanent}
            />
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
            <RoadmapTab namespace="analyze-me" />
          </div>

          <div style={{ display: activeTab === 'security' ? 'block' : 'none' }}>
            <SecurityTab />
          </div>

          <div style={{ display: activeTab === 'stack' ? 'block' : 'none' }}>
            <div className="max-w-xl">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground/95 mb-3">
                {t('technologiesLabel')}
              </p>
              <div className="flex flex-col gap-1.5 mb-6">
                {(t('items', { returnObjects: true }) as { name: string; license: string; desc: string }[]).map(item => (
                  <div key={item.name} className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <div>
                      <span className="text-xs text-foreground">{item.name}</span>
                      <span className="text-xs text-muted-foreground/95 ml-2">{item.desc}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/95">{item.license}</span>
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
                <span className="text-xs text-muted-foreground/95">{t('badge')}</span>
              </div>
            </div>
          </div>
        </div>

        <div data-no-print className="h-8 border-t border-border/50 flex items-center px-6 gap-5 flex-shrink-0">
          {(t('badges', { returnObjects: true }) as string[]).map(item => (
            <span key={item} className="text-[10px] text-muted-foreground/70">
              <span className="mr-1 text-muted-foreground/70">//</span>{item}
            </span>
          ))}
        </div>
      </main>

    </div>
  )
}
