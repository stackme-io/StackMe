import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ModuleTabs } from '../../shared/ModuleTabs'
import { MobileToolGate } from '../../shared/MobileToolGate'
import { OnboardingFlow } from '../../shared/OnboardingFlow'
import { Sidebar } from './Sidebar'
import { GenerateTab } from './tabs/GenerateTab'
import { RoadmapTab } from '../../shared/RoadmapTab'
import { StackTab } from './tabs/StackTab'
import type { ParsedField } from './SchemaSection'
import type { AnomalyType, ViewMode } from './types'

const HINT_KEY = 'stackme-hint-forge-me'

const DEFAULT_SELECTED: AnomalyType[] = ['nulls', 'duplicates', 'outliers']
const STORAGE_KEY = 'forgeme-settings'

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

export default function ForgeMePage() {
  const stored                           = useState(loadSettings)[0]
  const [activeTab, setActiveTab]        = useState('generate')
  const [sidebarOpen, setSidebarOpen]    = useState(true)
  const [viewMode, setViewMode]          = useState<ViewMode>('raw')
  const [selected, setSelected]          = useState<Set<AnomalyType>>(new Set(stored?.selected ?? DEFAULT_SELECTED))
  const [seed, setSeed]                  = useState<number>(stored?.seed ?? 42)
  const [rows, setRows]                  = useState<number>(stored?.rows ?? 100)
  const [anomalyRate, setAnomalyRate]    = useState<number>(stored?.anomalyRate ?? 0.05)
  const [schemaFields, setSchemaFields]  = useState<ParsedField[]>([])
  const [hintPermanent, setHintPermanent] = useState(() => !!localStorage.getItem(HINT_KEY))
  const [hintVisible, setHintVisible]     = useState(true)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ seed, rows, anomalyRate, selected: [...selected] }))
    } catch {}
  }, [seed, rows, anomalyRate, selected])

  const { t } = useTranslation('forge-me')

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

  const hintSteps = [
    { title: t('hint1Title'), desc: t('hint1Desc') },
    { title: t('hint2Title'), desc: t('hint2Desc') },
    { title: t('hint3Title'), desc: t('hint3Desc') },
    { title: t('hint4Title'), desc: t('hint4Desc') },
  ]

  const toggleAnomaly = useCallback((id: AnomalyType) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  return (
    <div className="flex h-full relative overflow-hidden">

      <aside
        className="hidden md:block flex-shrink-0 border-r border-border overflow-hidden transition-all duration-200"
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
        className="hidden md:flex absolute top-1/2 -translate-y-1/2 z-10 w-3.5 h-9 items-center justify-center bg-background border border-border rounded-r-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        style={{ left: sidebarOpen ? '208px' : '0px' }}
      >
        <span className="text-[10px]">{sidebarOpen ? '‹' : '›'}</span>
      </button>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-5">

          <ModuleTabs
            tabs={[
              { id: 'generate', label: t('tabs.generate') },
              { id: 'roadmap',  label: t('tabs.roadmap')  },
              { id: 'stack',    label: t('tabs.stack')    },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            onShowHint={hintPermanent || !hintVisible ? handleShowHint : undefined}
          />

          <div style={{ display: activeTab === 'generate' ? 'block' : 'none' }}>
            <MobileToolGate descKey="modules.forge-me.description" />
            <div className="hidden md:block">
              <OnboardingFlow
                steps={hintSteps}
                visible={!hintPermanent && hintVisible}
                onHideSession={() => setHintVisible(false)}
                onHidePermanent={handleHidePermanent}
              />
              <GenerateTab
                selected={selected}
                viewMode={viewMode}
                seed={seed}
                rows={rows}
                anomalyRate={anomalyRate}
                schemaFields={schemaFields}
                onSeedChange={setSeed}
                onRowsChange={setRows}
                onAnomalyRateChange={setAnomalyRate}
                onSchemaReady={setSchemaFields}
              />
            </div>
          </div>

          <div style={{ display: activeTab === 'roadmap' ? 'block' : 'none' }}>
            <RoadmapTab namespace="forge-me" />
          </div>

          <div style={{ display: activeTab === 'stack' ? 'block' : 'none' }}>
            <StackTab />
          </div>

        </div>

        <div className="h-8 border-t border-border/50 flex items-center px-4 md:px-6 gap-5 flex-shrink-0 overflow-x-auto">
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