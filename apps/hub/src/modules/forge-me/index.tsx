import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ModuleTabs } from '../../shared/ModuleTabs'
import { Sidebar } from './Sidebar'
import { GenerateTab } from './tabs/GenerateTab'
import { RoadmapTab } from './tabs/RoadmapTab'
import { StackTab } from './tabs/StackTab'
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

          <div style={{ display: activeTab === 'generate' ? 'block' : 'none' }}>
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

          <div style={{ display: activeTab === 'roadmap' ? 'block' : 'none' }}>
            <RoadmapTab />
          </div>

          <div style={{ display: activeTab === 'stack' ? 'block' : 'none' }}>
            <StackTab />
          </div>

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